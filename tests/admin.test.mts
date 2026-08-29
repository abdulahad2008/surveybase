import test from "node:test";
import assert from "node:assert/strict";
import {
  ROLES,
  isRole,
  isAdmin,
  refuseRoleChange,
  rollupByDay,
  totalActivity,
  type RoleChange,
} from "@/lib/admin";

const base: RoleChange = {
  actorRole: "admin",
  actorId: "actor",
  targetId: "target",
  targetRole: "user",
  nextRole: "moderator",
  adminCount: 2,
};

test("only admin counts as admin", () => {
  assert.equal(isAdmin("admin"), true);
  for (const role of ["moderator", "depositor", "user", "", null, undefined]) {
    assert.equal(isAdmin(role), false, `${role} must not pass as admin`);
  }
});

test("isRole rejects anything outside the column's check constraint", () => {
  for (const role of ROLES) assert.equal(isRole(role), true);
  // The value arrives from a <select> in a form, so it is attacker-controlled
  // even though the UI only ever offers these four.
  for (const hostile of ["superadmin", "ADMIN", " admin", "", null, 1, {}]) {
    assert.equal(isRole(hostile), false, `should reject ${JSON.stringify(hostile)}`);
  }
});

test("a non-admin cannot change roles, whatever they ask for", () => {
  for (const actorRole of ["moderator", "depositor", "user", null]) {
    assert.equal(refuseRoleChange({ ...base, actorRole }), "errorAuth");
  }
});

test("an admin may promote and demote", () => {
  assert.equal(refuseRoleChange(base), null);
  assert.equal(
    refuseRoleChange({ ...base, targetRole: "moderator", nextRole: "user" }),
    null,
  );
});

test("an unknown role is refused before it reaches the database", () => {
  assert.equal(refuseRoleChange({ ...base, nextRole: "superadmin" }), "errorRole");
});

test("setting the role a user already has is refused as a no-op", () => {
  assert.equal(
    refuseRoleChange({ ...base, targetRole: "moderator", nextRole: "moderator" }),
    "errorNoop",
  );
});

test("the last admin cannot be demoted, by themselves or by anyone", () => {
  const lastAdmin: RoleChange = {
    ...base,
    targetRole: "admin",
    nextRole: "moderator",
    adminCount: 1,
  };
  // Self-demotion.
  assert.equal(refuseRoleChange({ ...lastAdmin, targetId: "actor" }), "errorLastAdmin");
  // And the same move made by some other admin — the count is what matters,
  // not who clicked.
  assert.equal(refuseRoleChange(lastAdmin), "errorLastAdmin");

  // With a second admin in place the demotion is allowed again.
  assert.equal(refuseRoleChange({ ...lastAdmin, adminCount: 2 }), null);

  // Demoting a non-admin is unaffected by how many admins there are.
  assert.equal(
    refuseRoleChange({ ...base, targetRole: "moderator", nextRole: "user", adminCount: 1 }),
    null,
  );
});

test("totalActivity separates outbound clicks from file downloads", () => {
  const totals = totalActivity([
    { created_at: "2026-08-29T10:00:00Z", format: "link" },
    { created_at: "2026-08-29T11:00:00Z", format: "csv" },
    { created_at: "2026-08-29T12:00:00Z", format: "xlsx" },
    { created_at: "2026-08-29T13:00:00Z", format: "link" },
  ]);
  assert.deepEqual(totals, { links: 2, files: 2, total: 4 });
  assert.deepEqual(totalActivity([]), { links: 0, files: 0, total: 0 });
});

test("rollupByDay keeps empty days so a quiet week reads as quiet", () => {
  const now = new Date("2026-08-29T09:30:00Z");
  const days = rollupByDay(
    [
      { created_at: "2026-08-29T01:00:00Z", format: "link" },
      { created_at: "2026-08-27T23:59:59Z", format: "csv" },
      { created_at: "2026-08-27T00:00:00Z", format: "link" },
    ],
    3,
    now,
  );

  assert.deepEqual(days, [
    { day: "2026-08-29", links: 1, files: 0 },
    { day: "2026-08-28", links: 0, files: 0 },
    { day: "2026-08-27", links: 1, files: 1 },
  ]);
});

test("rollupByDay ignores events outside the window instead of miscounting them", () => {
  const days = rollupByDay(
    [
      { created_at: "2026-07-01T10:00:00Z", format: "link" },
      { created_at: "not a timestamp", format: "csv" },
      { created_at: "2026-08-29T10:00:00Z", format: "csv" },
    ],
    2,
    new Date("2026-08-29T09:30:00Z"),
  );
  assert.deepEqual(days, [
    { day: "2026-08-29", links: 0, files: 1 },
    { day: "2026-08-28", links: 0, files: 0 },
  ]);
});
