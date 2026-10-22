const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const FUTURE_DATE = new Date(Date.now() + 7 * 864e5).toISOString();

jest.setTimeout(60000);
jest.mock('../services/ai', () => ({
  generateIdeas: jest.fn().mockResolvedValue([{ title: 'Idea', category: 'Tech', why: 'Because', expectedTurnout: 50 }]),
  chatIdeas: jest.fn().mockResolvedValue({ reply: 'Sure', ideas: [] }),
}));

process.env.JWT_SECRET = 'test_secret_do_not_use_in_prod';
process.env.JWT_EXPIRES_IN = '1h';

let mongod, app, User, Club;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
    await mongoose.connect(process.env.MONGODB_URI, { runtimeAdapters: { os: require('os') } });
  app = require('../app');
  ({ User, Club } = require('../models'));
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
}, 30000);

afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

async function signup(email, password = 'pass123') {
  return (await request(app).post('/api/auth/signup').send({ name: 'Test User', email, password })).body;
}
async function login(email, password = 'pass123') {
  return (await request(app).post('/api/auth/login').send({ email, password })).body;
}
async function makeAdmin(email) {
  await User.findOneAndUpdate({ email }, { role: 'website_admin' });
}
async function siteAdminToken() {
  await signup('site@rotom.edu'); await makeAdmin('site@rotom.edu');
  return (await login('site@rotom.edu')).token;
}
async function clubAdminToken(email, clubId) {
  await signup(email);
  await User.findOneAndUpdate({ email }, { role: 'club_admin', clubs: [clubId] });
  return (await login(email)).token;
}
async function seedClub(siteToken, name = 'Club X') {
  const auth = { Authorization: `Bearer ${siteToken}` };
  const club = (await request(app).post('/api/clubs').set(auth).send({ name, category: 'Tech' })).body.club._id;
  const event = (await request(app).post('/api/events').set(auth).send({ club, title: 'E', date: FUTURE_DATE, startTime: '12:00', venue: 'Hall' })).body.event._id;
  await request(app).post('/api/announcements').set(auth).send({ club, title: 'T', content: 'C' });
  return { club, event };
}

describe('response redaction', () => {
  it('never returns passwordHash', async () => {
    const { user: su } = await signup('a@rotom.edu');
    expect(su.passwordHash).toBeUndefined();
    const { token, user: lu } = await login('a@rotom.edu');
    expect(lu.passwordHash).toBeUndefined();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.user.passwordHash).toBeUndefined();
  });

  it('hides organizer email on public event responses', async () => {
    await signup('admin@rotom.edu'); await makeAdmin('admin@rotom.edu');
    const { token } = await login('admin@rotom.edu');
    const club = await request(app).post('/api/clubs').set('Authorization', `Bearer ${token}`).send({ name: 'Club A', category: 'Tech' });
    const event = await request(app).post('/api/events').set('Authorization', `Bearer ${token}`).send({ club: club.body.club._id, title: 'E', date: FUTURE_DATE, startTime: '12:00', venue: 'Hall' });
    const pub = await request(app).get(`/api/events/${event.body.event._id}`);
    expect(pub.body.event.organizers[0].email).toBeUndefined();
  });

  it('excludes orgChart from public club responses', async () => {
    await signup('admin2@rotom.edu'); await makeAdmin('admin2@rotom.edu');
    const { token } = await login('admin2@rotom.edu');
    const club = await request(app).post('/api/clubs').set('Authorization', `Bearer ${token}`).send({ name: 'Club B', category: 'Tech' });
    const pub = await request(app).get(`/api/clubs/${club.body.club._id}`);
    expect(pub.body.club.orgChart).toBeUndefined();
  });
});

describe('authentication rate limits', () => {
  it('counts failed login attempts only and excludes /auth/me', async () => {
    const email = 'rate-limit@rotom.edu';
    await signup(email);
    expect(app.get('trust proxy')).toBe(1);

    const realEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      for (let i = 0; i < 20; i++) {
        const res = await request(app).post('/api/auth/login').send({ email, password: 'pass123' });
        expect(res.status).toBe(200);
      }
      for (let i = 0; i < 25; i++) {
        expect((await request(app).get('/api/auth/me')).status).toBe(401);
      }
      for (let i = 0; i < 20; i++) {
        const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
        expect(res.status).toBe(401);
      }
      const blocked = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
      expect(blocked.status).toBe(429);
    } finally {
      process.env.NODE_ENV = realEnv;
    }
  });
});

describe('RBAC / IDOR', () => {
  it('blocks a student from creating an event', async () => {
    await signup('student1@rotom.edu');
    const { token } = await login('student1@rotom.edu');
    const res = await request(app).post('/api/events').set('Authorization', `Bearer ${token}`).send({ club: new mongoose.Types.ObjectId().toString(), title: 'X', date: FUTURE_DATE, startTime: '12:00', venue: 'Hall' });
    expect(res.status).toBe(403);
  });

  it('blocks a club_admin from editing a club they do not own', async () => {
    await signup('siteadmin@rotom.edu'); await makeAdmin('siteadmin@rotom.edu');
    const { token: siteToken } = await login('siteadmin@rotom.edu');
    const clubA = await request(app).post('/api/clubs').set('Authorization', `Bearer ${siteToken}`).send({ name: 'A', category: 'Tech' });
    const clubB = await request(app).post('/api/clubs').set('Authorization', `Bearer ${siteToken}`).send({ name: 'B', category: 'Tech' });
    await signup('clubadmin_a@rotom.edu');
    await User.findOneAndUpdate({ email: 'clubadmin_a@rotom.edu' }, { role: 'club_admin', clubs: [clubA.body.club._id] });
    const { token: aToken } = await login('clubadmin_a@rotom.edu');
    const res = await request(app).patch(`/api/clubs/${clubB.body.club._id}`).set('Authorization', `Bearer ${aToken}`).send({ description: 'hijacked' });
    expect(res.status).toBe(403);
  });
});

describe('token revocation', () => {
  it('rejects a token once the account is deactivated', async () => {
    await signup('deactivate@rotom.edu');
    const { token, user } = await login('deactivate@rotom.edu');
    await User.findByIdAndUpdate(user.id, { isActive: false });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('reflects a role change immediately, without re-login', async () => {
    await signup('promote@rotom.edu');
    const { token, user } = await login('promote@rotom.edu');
    await User.findByIdAndUpdate(user.id, { role: 'website_admin' });
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});    

describe('club and event removal', () => {
  it('enforces roles on club delete', async () => {
    const site = await siteAdminToken();
    const { club } = await seedClub(site);
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    const ca = await clubAdminToken('ca@rotom.edu', club);
    const del = (t) => (t ? request(app).delete(`/api/clubs/${club}`).set('Authorization', `Bearer ${t}`) : request(app).delete(`/api/clubs/${club}`));
    expect((await del()).status).toBe(401);
    expect((await del(stu)).status).toBe(403);
    expect((await del(ca)).status).toBe(403);
    expect((await del(site)).status).toBe(200);
    expect((await del(site)).status).toBe(404);
  });

  it('cascades club removal to events, announcements and registrations', async () => {
    const site = await siteAdminToken();
    const { club, event } = await seedClub(site);
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    await request(app).delete(`/api/clubs/${club}`).set('Authorization', `Bearer ${site}`);
    const as = (t, method, path) => request(app)[method](path).set('Authorization', `Bearer ${t}`);
    expect((await request(app).get(`/api/events/${event}`)).status).toBe(404);
    expect((await request(app).get('/api/announcements')).body.announcements).toHaveLength(0);
    expect((await as(stu, 'post', `/api/events/${event}/register`)).status).toBe(404);
    expect((await as(site, 'get', `/api/events/${event}/registrations`)).status).toBe(404);
    expect((await as(site, 'get', `/api/events/${event}/attendance`)).status).toBe(404);
  });

  it('enforces ownership on event delete', async () => {
    const site = await siteAdminToken();
    const a = await seedClub(site, 'A');
    const b = await seedClub(site, 'B');
    const other = await clubAdminToken('other@rotom.edu', b.club);
    const owner = await clubAdminToken('owner@rotom.edu', a.club);
    const del = (t, id) => request(app).delete(`/api/events/${id}`).set('Authorization', `Bearer ${t}`);
    expect((await del(other, a.event)).status).toBe(403);
    expect((await del(owner, a.event)).status).toBe(200);
    expect((await del(owner, a.event)).status).toBe(404);
    expect((await del(site, b.event)).status).toBe(200);
  });
});

describe('smart scheduling', () => {
  const { suggestSlots, earliestDate } = require('../utils/schedule');
  it('skips weekends and blocked dates and prefers Mon-Wed', () => {
    const slots = suggestSlots([{ startDate: '2026-10-05', endDate: '2026-10-09' }], { from: '2026-10-04', count: 5 });
    expect(slots.map((s) => s.date)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-19', '2026-10-20']);
    expect(slots.every((s) => s.startTime === '12:00')).toBe(true);
    expect(suggestSlots([], { from: '2026-10-08', horizon: 3 }).map((s) => s.date)).toEqual(['2026-10-08', '2026-10-09']);
  });

  it('enforces roles and validates input on schedule endpoints', async () => {
    const site = await siteAdminToken();
    const { club } = await seedClub(site);
    const ca = await clubAdminToken('ca@rotom.edu', club);
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    const call = (t, method, path, body) => {
      let r = request(app)[method](path);
      if (t) r = r.set('Authorization', `Bearer ${t}`);
      return body ? r.send(body) : r;
    };
    const block = { type: 'midsem', label: 'Midsem', startDate: '2026-10-12', endDate: '2026-10-16' };
    expect((await call(null, 'get', '/api/schedule/suggestions')).status).toBe(401);
    expect((await call(null, 'get', '/api/schedule/blocks')).status).toBe(200);
    expect((await call(null, 'post', '/api/schedule/blocks', block)).status).toBe(401);
    expect((await call(stu, 'get', '/api/schedule/suggestions')).status).toBe(403);
    expect((await call(ca, 'post', '/api/schedule/blocks', block)).status).toBe(403);
    expect((await call(site, 'post', '/api/schedule/blocks', { ...block, startDate: '2026-13-45' })).status).toBe(400);
    const created = await call(site, 'post', '/api/schedule/blocks', block);
    expect(created.status).toBe(201);
    const res = await call(ca, 'get', '/api/schedule/suggestions?from=2026-10-12&count=3');
    expect(res.status).toBe(200);
    expect(res.body.suggestions).toHaveLength(3);
    expect(res.body.suggestions.every((s) => s.date > '2026-10-16')).toBe(true);
    expect((await call(ca, 'get', '/api/schedule/suggestions?count=50')).status).toBe(400);
    expect((await call(ca, 'get', '/api/schedule/suggestions?from=2000-01-01&count=1')).body.suggestions[0].date >= earliestDate()).toBe(true);
    expect((await call(ca, 'get', '/api/schedule/suggestions?from=2026-10-12&from=2026-10-13')).status).toBe(400);    
    const id = created.body.block._id;
    expect((await call(ca, 'delete', `/api/schedule/blocks/${id}`)).status).toBe(403);
    expect((await call(site, 'delete', `/api/schedule/blocks/${id}`)).status).toBe(200);
    expect((await call(site, 'delete', `/api/schedule/blocks/${id}`)).status).toBe(404);
  });
});

describe('AI event ideas', () => {
  it('enforces role and ownership, validates input and handles AI failure', async () => {
    const site = await siteAdminToken();
    const a = await seedClub(site, 'A');
    const b = await seedClub(site, 'B');
    const owner = await clubAdminToken('owner@rotom.edu', a.club);
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    const post = (t, id) => (t ? request(app).post(`/api/ai/event-ideas/${id}`).set('Authorization', `Bearer ${t}`) : request(app).post(`/api/ai/event-ideas/${id}`));
    expect((await post(null, a.club)).status).toBe(401);
    expect((await post(stu, a.club)).status).toBe(403);
    expect((await post(owner, b.club)).status).toBe(403);
    const ok = await post(owner, a.club);
    expect(ok.status).toBe(200);
    expect(ok.body.ideas).toHaveLength(1);
    expect((await post(site, b.club)).status).toBe(200);
    expect((await post(site, 'not-an-id')).status).toBe(400);
    expect((await post(site, new mongoose.Types.ObjectId().toString())).status).toBe(404);
    require('../services/ai').generateIdeas.mockRejectedValueOnce(new Error('boom'));
    expect((await post(owner, a.club)).status).toBe(502);
  });

  describe('AI upstream failures', () => {
  const ai = require('../services/ai');
  const upstream = (status, message) => Object.assign(new Error(message), status ? { status } : {});

  it.each([
    ['event-ideas', 'generateIdeas', {}],
    ['chat', 'chatIdeas', { messages: [{ role: 'user', content: 'hi' }] }],
  ])('maps upstream errors on %s and never leaks details', async (route, fn, body) => {
    const site = await siteAdminToken();
    const { club } = await seedClub(site, 'A');
    const owner = await clubAdminToken('owner@rotom.edu', club);
    const call = () => request(app).post(`/api/ai/${route}/${club}`).set('Authorization', `Bearer ${owner}`).send(body);

    ai[fn].mockRejectedValueOnce(upstream(429, 'quota exceeded key=AIza-SECRET'));
    const busy = await call();
    expect(busy.status).toBe(429);
    expect(busy.headers['retry-after']).toBe('60');
    expect(busy.body.error).toBe('AI is busy, try again in a minute');
    expect(JSON.stringify(busy.body)).not.toContain('AIza-SECRET');

    ai[fn].mockRejectedValueOnce(upstream(504, 'AI request timed out'));
    const slow = await call();
    expect(slow.status).toBe(504);
    expect(slow.body.error).toBe('AI request timed out, try again');

    ai[fn].mockRejectedValueOnce(upstream(500, 'internal key=AIza-SECRET'));
    const down = await call();
    expect(down.status).toBe(502);
    expect(JSON.stringify(down.body)).not.toContain('AIza-SECRET');

    ai[fn].mockRejectedValueOnce(upstream(undefined, 'Bad AI output'));
    expect((await call()).status).toBe(502);
  });
});

describe('AI stats aggregation', () => {
  it('sends correct registered and attended counts and trims long titles', async () => {
    const { Registration, Event } = require('../models');
    const { generateIdeas } = require('../services/ai');
    const site = await siteAdminToken();
    const { club, event } = await seedClub(site, 'Club X');
    await Event.updateOne({ _id: event }, { date: new Date(Date.now() - 86400000), title: 'T'.repeat(200) });

    const userId = async (email) => { await signup(email); return (await login(email)).user.id; };
    const s1 = await userId('s1@rotom.edu');
    const s2 = await userId('s2@rotom.edu');
    const r1 = await Registration.create({ event, student: s1, status: 'registered' });
await Registration.create({ event, student: s2, status: 'registered' });

    const mark = await request(app).patch(`/api/events/${event}/attendance`)
      .set('Authorization', `Bearer ${site}`).send({ registrationId: r1._id.toString(), attended: true });
    expect(mark.status).toBe(200);

    generateIdeas.mockClear();
    const res = await request(app).post(`/api/ai/event-ideas/${club}`).set('Authorization', `Bearer ${site}`);
    expect(res.status).toBe(200);
    const stats = generateIdeas.mock.calls[0][0];
    expect(stats.club).toBe('Club X');
    expect(stats.genre).toBe('Tech');
    expect(stats.pastEvents).toHaveLength(1);
    expect(stats.pastEvents[0]).toMatchObject({ registered: 2, attended: 1 });
    expect(stats.pastEvents[0].title).toHaveLength(120);
  });
});

describe('AI rate limits', () => {
  it('allows five requests per user across both routes, and students never use quota', async () => {
    const site = await siteAdminToken();
    const { club } = await seedClub(site, 'A');
    const owner = await clubAdminToken('owner@rotom.edu', club);
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    const ideas = (t) => request(app).post(`/api/ai/event-ideas/${club}`).set('Authorization', `Bearer ${t}`).send({});
    const chat = (t) => request(app).post(`/api/ai/chat/${club}`).set('Authorization', `Bearer ${t}`)
      .send({ messages: [{ role: 'user', content: 'hi' }] });

    // The limiters are skipped under NODE_ENV=test, so switch it on only around the AI calls.
    const realEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      expect((await ideas(stu)).status).toBe(403);   // blocked before any limiter runs
      expect((await ideas(owner)).status).toBe(200);
      expect((await chat(owner)).status).toBe(200);
      expect((await ideas(owner)).status).toBe(200);
      expect((await chat(owner)).status).toBe(200);
      expect((await ideas(owner)).status).toBe(200); // fifth request shared across routes
      const blocked = await ideas(owner);
      expect(blocked.status).toBe(429); // per-user cap
      expect(blocked.body.error).toBe('Too many requests, try again in a minute');
      expect((await ideas(site)).status).toBe(200); // global cap does not undercut per-user limit
    } finally {
      process.env.NODE_ENV = realEnv;
    }
  });
});

  it('validates and serves the ideas chat', async () => {
    const site = await siteAdminToken();
    const a = await seedClub(site, 'A');
    const b = await seedClub(site, 'B');
    const owner = await clubAdminToken('owner@rotom.edu', a.club);
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    const chat = (t, id, messages) => request(app).post(`/api/ai/chat/${id}`).set('Authorization', `Bearer ${t}`).send({ messages });
    const msgs = [{ role: 'user', content: 'cheaper ideas' }];
    expect((await chat(stu, a.club, msgs)).status).toBe(403);
    expect((await chat(owner, b.club, msgs)).status).toBe(403);
    const ok = await chat(owner, a.club, msgs);
    expect(ok.status).toBe(200);
    expect(ok.body.reply).toBe('Sure');
    expect((await chat(owner, a.club, [])).status).toBe(400);
    expect((await chat(owner, a.club, [{ role: 'assistant', content: 'hi' }])).status).toBe(400);
    expect((await chat(owner, a.club, [{ role: 'user', content: 'x'.repeat(501) }])).status).toBe(400);
    expect((await chat(owner, a.club, [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }])).status).toBe(400);
    expect((await chat(owner, a.club, 'not an array')).status).toBe(400);
  });
});
describe('org chart', () => {
  it('stores a hierarchy and rejects loops, duplicates and bad input', async () => {
    const site = await siteAdminToken();
    const { club } = await seedClub(site);
    const owner = await clubAdminToken('owner@rotom.edu', club);
    const save = (orgChart) => request(app).patch(`/api/clubs/${club}`).set('Authorization', `Bearer ${owner}`).send({ orgChart });
    const a = { key: 'a', position: 'President', reportsTo: null };
    const b = { key: 'b', position: 'Treasurer', reportsTo: 'a' };
    expect((await save([a, b])).status).toBe(200);
    const chart = await request(app).get(`/api/clubs/${club}/org-chart`).set('Authorization', `Bearer ${owner}`);
    expect(chart.body.orgChart.find((e) => e.key === 'b').reportsTo).toBe('a');
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    const view = await request(app).get(`/api/clubs/${club}/org-chart`).set('Authorization', `Bearer ${stu}`);
    expect(view.status).toBe(200);
    expect(view.body.orgChart.find((e) => e.key === 'b').reportsTo).toBe('a');
    expect(Object.keys(view.body.orgChart[0]).sort()).toEqual(['key', 'name', 'position', 'reportsTo']);
    expect((await request(app).get(`/api/clubs/${club}/org-chart`)).status).toBe(401);
    expect((await save([{ ...a, reportsTo: 'b' }, b])).status).toBe(400); // loop
    expect((await save([a, { ...b, key: 'a' }])).status).toBe(400); // duplicate key
    expect((await save([a, { ...b, reportsTo: 'zzz' }])).status).toBe(400); // unknown boss
    expect((await save([{ ...a, reportsTo: 'a' }])).status).toBe(400); // reports to itself
    expect((await save([{ position: 'No key' }])).status).toBe(400);
    expect((await save('not an array')).status).toBe(400);
    expect((await save(Array.from({ length: 41 }, (_, i) => ({ key: `k${i}`, position: 'P' })))).status).toBe(400);
    expect((await save([{ ...a, member: 'not-an-id' }])).status).toBe(400);
  });
});

describe('club logo URL', () => {
  const bad = [
    'http://example.com/logo.png',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    'https://',
    'https://exa mple.com/x.png',
  ];

  it('accepts only https or empty when creating a club', async () => {
    const site = await siteAdminToken();
    const create = (name, logoUrl) => request(app).post('/api/clubs')
      .set('Authorization', `Bearer ${site}`).send({ name, category: 'Tech', logoUrl });
    for (const [i, url] of bad.entries()) expect((await create(`Bad ${i}`, url)).status).toBe(400);
    const ok = await create('Good', 'https://example.com/logo.png');
    expect([200, 201]).toContain(ok.status);
    expect(ok.body.club.logoUrl).toBe('https://example.com/logo.png');
    expect([200, 201]).toContain((await create('Empty', '')).status);
  });

  it('enforces the same rule when editing a club', async () => {
    const site = await siteAdminToken();
    const { club } = await seedClub(site);
    const owner = await clubAdminToken('owner@rotom.edu', club);
    const patch = (logoUrl) => request(app).patch(`/api/clubs/${club}`)
      .set('Authorization', `Bearer ${owner}`).send({ logoUrl });
    const stored = async () => (await request(app).get(`/api/clubs/${club}`)).body.club.logoUrl;

    expect((await patch('https://example.com/new.png')).status).toBe(200);
    for (const url of bad) expect((await patch(url)).status).toBe(400);
    expect(await stored()).toBe('https://example.com/new.png'); // rejected edits changed nothing
    expect((await patch('')).status).toBe(200);
    expect(await stored()).toBe('');
  });
});


describe('role-access matrix', () => {
  const ok = 'ok'; // allowed: anything except 401 or 403 (validation or 404 are fine here)

  it('enforces who may call each endpoint', async () => {
    const site = await siteAdminToken();
    const a = await seedClub(site, 'A');
    const b = await seedClub(site, 'B');
    const owner = await clubAdminToken('owner@rotom.edu', a.club);
    const other = await clubAdminToken('other@rotom.edu', b.club);
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    const tokens = { guest: null, student: stu, other, owner, site };

    const event = { club: a.club, title: 'M', date: FUTURE_DATE, startTime: '12:00', venue: 'Hall' };
    const staff = { guest: 401, student: 403, other: 403, owner: ok, site: ok }; // club staff only
    const rows = [
      ['GET /auth/me', 'get', '/api/auth/me', null, { guest: 401, student: ok, other: ok, owner: ok, site: ok }],
      ['GET /users', 'get', '/api/users', null, { guest: 401, student: 403, site: ok }],
      ['POST /clubs', 'post', '/api/clubs', { name: 'Matrix Club', category: 'Tech' }, { guest: 401, student: 403, other: 403, owner: 403, site: ok }],
      ['PATCH /clubs/:id', 'patch', `/api/clubs/${a.club}`, { description: 'd' }, staff],
      ['GET /clubs/:id/org-chart', 'get', `/api/clubs/${a.club}/org-chart`, null, { guest: 401, student: ok, other: ok, owner: ok, site: ok }],
      ['POST /events', 'post', '/api/events', event, staff],
      ['PATCH /events/:id', 'patch', `/api/events/${a.event}`, { venue: 'New Hall' }, staff],
      ['GET /events/:id/registrations', 'get', `/api/events/${a.event}/registrations`, null, staff],
      ['GET /events/:id/attendance', 'get', `/api/events/${a.event}/attendance`, null, staff],
      ['POST /announcements', 'post', '/api/announcements', { club: a.club, title: 'T', content: 'C' }, staff],
      ['POST /events/:id/register', 'post', `/api/events/${a.event}/register`, null, { guest: 401, student: ok }],
      ['GET /me/registrations', 'get', '/api/me/registrations', null, { guest: 401, student: ok }],
    ];

    // Collect every mismatch so one run shows the whole list.
    const failures = [];
    for (const [label, method, path, body, expected] of rows) {
      for (const [role, want] of Object.entries(expected)) {
        let r = request(app)[method](path);
        if (tokens[role]) r = r.set('Authorization', `Bearer ${tokens[role]}`);
        const { status } = await (body ? r.send(body) : r);
        const good = want === ok ? status !== 401 && status !== 403 : status === want;
        if (!good) failures.push(`${label} as ${role}: got ${status}, wanted ${want}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('keeps public endpoints open and rejects bad tokens', async () => {
    const site = await siteAdminToken();
    const a = await seedClub(site, 'A');
    const publicPaths = ['/api/health', '/api/clubs', `/api/clubs/${a.club}`, '/api/events',
      `/api/events/${a.event}`, '/api/announcements', '/api/schedule/blocks'];
    for (const path of publicPaths) expect((await request(app).get(path)).status).toBe(200);

    const me = (header) => request(app).get('/api/auth/me').set('Authorization', header);
    expect((await me('Bearer not.a.jwt')).status).toBe(401);
    expect((await me('Basic abc')).status).toBe(401);
  });
});

describe('registration rules', () => {
  const as = (t, method, path) => request(app)[method](path).set('Authorization', `Bearer ${t}`);

  it('handles register, duplicate, cancel and re-register', async () => {
    const site = await siteAdminToken();
    const { event } = await seedClub(site);
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    const reg = () => as(stu, 'post', `/api/events/${event}/register`);
    const cancel = () => as(stu, 'delete', `/api/events/${event}/register`);
    const mine = async () => (await as(stu, 'get', '/api/me/registrations')).body.registrations;

    expect((await as(stu, 'post', '/api/events/not-an-id/register')).status).toBe(400);
    expect((await as(stu, 'post', `/api/events/${new mongoose.Types.ObjectId()}/register`)).status).toBe(404);
    expect((await cancel()).status).toBe(404); // nothing to cancel yet
    const first = await reg();
    expect(first.status).toBe(201);
    expect((await reg()).status).toBe(409); // duplicate
    expect(await mine()).toHaveLength(1);
    expect((await cancel()).status).toBe(200);
    expect((await cancel()).status).toBe(404); // already cancelled
    expect(await mine()).toHaveLength(0);
    const again = await reg();
    expect(again.status).toBe(200); // re-register reuses the same row
    expect(again.body.registration._id).toBe(first.body.registration._id);
    expect(await mine()).toHaveLength(1);
  });

  it('hides removed events from registration and "my registrations"', async () => {
    const site = await siteAdminToken();
    const { event } = await seedClub(site);
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    expect((await as(stu, 'post', `/api/events/${event}/register`)).status).toBe(201);
    expect((await as(stu, 'get', '/api/me/registrations')).body.registrations).toHaveLength(1);
    expect((await as(site, 'delete', `/api/events/${event}`)).status).toBe(200);
    expect((await as(stu, 'get', '/api/me/registrations')).body.registrations).toHaveLength(0);
    expect((await as(stu, 'post', `/api/events/${event}/register`)).status).toBe(404);
    expect((await as(site, 'get', `/api/events/${event}/registrations`)).status).toBe(404);
  });

it('keeps registration open through the event day and closes it afterwards', async () => {
  const site = await siteAdminToken();
  const { club } = await seedClub(site);
  await signup('stu@rotom.edu');
  const stu = (await login('stu@rotom.edu')).token;
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0); // forms store dates at the start of the day
  const daysAgo = (n) => new Date(startOfToday.getTime() - n * 864e5).toISOString();
  const makeEvent = async (title, date) => (await request(app).post('/api/events')
    .set('Authorization', `Bearer ${site}`)
    .send({ club, title, date, startTime: '12:00', venue: 'Hall' })).body.event._id;
  const register = (event) => request(app).post(`/api/events/${event}/register`)
    .set('Authorization', `Bearer ${stu}`);

  expect((await register(await makeEvent('Today', startOfToday.toISOString()))).status).toBe(201);
  expect((await register(await makeEvent('Two days ago', daysAgo(2)))).status).toBe(400);
});
});

describe('attendance rules', () => {
  it('lets only the event staff mark registered attendees, and only for this event', async () => {
    const { Attendance } = require('../models');
    const site = await siteAdminToken();
    const a = await seedClub(site, 'A');
    const b = await seedClub(site, 'B');
    const owner = await clubAdminToken('owner@rotom.edu', a.club);
    const other = await clubAdminToken('other@rotom.edu', b.club);
    await signup('stu@rotom.edu');
    const stu = (await login('stu@rotom.edu')).token;
    const reg = (await request(app).post(`/api/events/${a.event}/register`)
      .set('Authorization', `Bearer ${stu}`)).body.registration._id;

    const mark = (t, eventId, body) => request(app).patch(`/api/events/${eventId}/attendance`)
      .set('Authorization', `Bearer ${t}`).send(body);
    const list = async (t, eventId) => (await request(app).get(`/api/events/${eventId}/attendance`)
      .set('Authorization', `Bearer ${t}`)).body.attendance;
    const unknownId = new mongoose.Types.ObjectId().toString();

    expect((await mark(stu, a.event, { registrationId: reg, attended: true })).status).toBe(403);
    expect((await mark(other, a.event, { registrationId: reg, attended: true })).status).toBe(403);
    expect((await mark(owner, a.event, { registrationId: reg, attended: 'yes' })).status).toBe(400);
    expect((await mark(owner, a.event, { registrationId: 'bad', attended: true })).status).toBe(400);
    expect((await mark(owner, a.event, { registrationId: unknownId, attended: true })).status).toBe(404);
    // a registration for event A cannot be marked through event B
    expect((await mark(site, b.event, { registrationId: reg, attended: true })).status).toBe(404);

    let rows = await list(owner, a.event);
    expect(rows).toHaveLength(1);
    expect(rows[0].attended).toBe(false);
    expect(Object.keys(rows[0].student)).toEqual(['name']); // no email in the attendance list

    expect((await mark(owner, a.event, { registrationId: reg, attended: true })).status).toBe(200);
    expect((await list(owner, a.event))[0].attended).toBe(true);
    expect((await mark(owner, a.event, { registrationId: reg, attended: false })).status).toBe(200);
    expect((await list(owner, a.event))[0].attended).toBe(false);
    expect(await Attendance.countDocuments()).toBe(1); // marking twice updates, never duplicates

    await request(app).delete(`/api/events/${a.event}/register`).set('Authorization', `Bearer ${stu}`);
    rows = await list(owner, a.event);
    expect(rows).toHaveLength(0); // cancelled students drop off the list
  });
});