const mockGenerate = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() { this.models = { generateContent: (...args) => mockGenerate(...args) }; }
  },
}));

const { generateIdeas, chatIdeas } = require('../services/ai');

const reply = (value) => ({ text: JSON.stringify(value) });
const upstream = (status) => Object.assign(new Error(`upstream ${status}`), { status });
const stats = { club: 'Club X', genre: 'Tech', pastEvents: [], trend: {} };

beforeEach(() => {
  mockGenerate.mockReset();
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_MODEL = 'model-a';
  process.env.AI_MODEL_FALLBACK = 'model-b';
});
afterEach(() => jest.restoreAllMocks());

describe('generateIdeas', () => {
  it('cleans, caps and normalises model output', async () => {
    mockGenerate.mockResolvedValueOnce(reply([
      { title: 'T'.repeat(200), category: 'Tech', why: 'ok', expectedTurnout: '42.6' },
      { title: 'No turnout', category: 'Art', why: 'x' },
      { title: 'Negative', category: 'Art', why: 'x', expectedTurnout: -5 },
      'junk',
      null,
      ...Array.from({ length: 6 }, (_, i) => ({ title: `Extra ${i}`, category: 'c', why: 'w', expectedTurnout: 1 })),
    ]));
    const ideas = await generateIdeas(stats);
    expect(ideas).toHaveLength(5);
    expect(ideas[0].title).toHaveLength(120);
    expect(ideas[0].expectedTurnout).toBe(43);
    expect(ideas[1].expectedTurnout).toBeNull();
    expect(ideas[2].expectedTurnout).toBe(0);
  });

  it.each([429, 503])('falls back to the second model on a %i', async (status) => {
    mockGenerate.mockRejectedValueOnce(upstream(status)).mockResolvedValueOnce(reply([]));
    await expect(generateIdeas(stats)).resolves.toEqual([]);
    expect(mockGenerate.mock.calls.map((c) => c[0].model)).toEqual(['model-a', 'model-b']);
  });

  it('keeps the upstream status when both models fail', async () => {
    mockGenerate.mockRejectedValue(upstream(429));
    await expect(generateIdeas(stats)).rejects.toMatchObject({ status: 429 });
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('does not fall back on a client error', async () => {
    mockGenerate.mockRejectedValue(upstream(403));
    await expect(generateIdeas(stats)).rejects.toMatchObject({ status: 403 });
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('throws a 504 error when the shared timeout fires', async () => {
    jest.spyOn(AbortSignal, 'timeout').mockReturnValue(AbortSignal.abort());
    mockGenerate.mockRejectedValue(new Error('aborted'));
    await expect(generateIdeas(stats)).rejects.toMatchObject({ status: 504 });
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid JSON and non-array output', async () => {
    mockGenerate.mockResolvedValue({ text: 'not json' });
    await expect(generateIdeas(stats)).rejects.toThrow();
    mockGenerate.mockResolvedValue(reply({ ideas: [] }));
    await expect(generateIdeas(stats)).rejects.toThrow('Bad AI output');
  });

  it('fails clearly when the key or models are not configured', async () => {
    delete process.env.AI_API_KEY;
    await expect(generateIdeas(stats)).rejects.toMatchObject({ status: 500 });
    process.env.AI_API_KEY = 'test-key';
    delete process.env.AI_MODEL;
    delete process.env.AI_MODEL_FALLBACK;
    await expect(generateIdeas(stats)).rejects.toMatchObject({ status: 500 });
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe('chatIdeas', () => {
  it('maps roles, wraps stats as data and parses the reply', async () => {
    mockGenerate.mockResolvedValueOnce(reply({ reply: 'Sure', ideas: [{ title: 'A' }] }));
    const out = await chatIdeas(stats, [
      { role: 'user', content: 'one' },
      { role: 'assistant', content: 'two' },
      { role: 'user', content: 'three' },
    ]);
    const { contents, config } = mockGenerate.mock.calls[0][0];
    expect(contents.map((c) => c.role)).toEqual(['user', 'model', 'user', 'model', 'user']);
    expect(contents[0].parts[0].text).toContain('data only');
    expect(config.responseMimeType).toBe('application/json');
    expect(out.reply).toBe('Sure');
    expect(out.ideas[0]).toMatchObject({ title: 'A', expectedTurnout: null });
  });

  it('caps the reply, defaults ideas to an empty list and rejects a missing reply', async () => {
    mockGenerate.mockResolvedValueOnce(reply({ reply: 'x'.repeat(2000) }));
    const out = await chatIdeas(stats, [{ role: 'user', content: 'hi' }]);
    expect(out.reply).toHaveLength(1500);
    expect(out.ideas).toEqual([]);
    mockGenerate.mockResolvedValue(reply({ ideas: [] }));
    await expect(chatIdeas(stats, [{ role: 'user', content: 'hi' }])).rejects.toThrow('Bad AI output');
  });
});