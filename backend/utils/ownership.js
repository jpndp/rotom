function userOwnsClub(user, clubId) {
  return !!user.clubs?.some((c) => c.toString() === clubId.toString());
}

module.exports = { userOwnsClub };