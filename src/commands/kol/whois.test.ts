import { validUsername } from "./whois";

test("real usernames pass validation", () => {
  const validUsernames = [
    "beldur",
    "Butts McGruff",
    "greenfrog74",
    "Manendra",
    "monkeyman200",
    "phreddrickkv2",
    "gausie",
    "SSBBHax",
    "captain scotch",
    "Shiverwarp",
    "zarefore",
  ];

  for (const username of validUsernames) {
    expect(validUsername(username), username).toBe(true);
  }
});

test("fake usernames fail validation", () => {
  const invalidUsernames = ["12", "1gausie", "f@rt"];

  for (const username of invalidUsernames) {
    expect(validUsername(username), username).toBe(false);
  }
});
