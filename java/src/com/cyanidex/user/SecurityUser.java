package com.cyanidex.user;

/**
 * SecurityUser — models an operator with a clearance role and the
 * permission checks the Supabase RLS layer mirrors.
 *
 * OOP concepts: encapsulation + an enum-driven permission model.
 */
public class SecurityUser {

    public enum Role {
        ADMIN(3), ANALYST(2), VIEWER(1);

        private final int level;
        Role(int level) { this.level = level; }
        public int level() { return level; }
    }

    private final String id;
    private final String name;
    private final String email;
    private final Role role;

    public SecurityUser(String id, String name, String email, Role role) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public Role getRole() { return role; }

    public boolean canReadIntel() { return role.level() >= Role.VIEWER.level(); }
    public boolean canCreateIncident() { return role.level() >= Role.ANALYST.level(); }
    public boolean canManageUsers() { return role == Role.ADMIN; }

    @Override
    public String toString() {
        return String.format("%s <%s> [%s]", name, email, role);
    }
}
