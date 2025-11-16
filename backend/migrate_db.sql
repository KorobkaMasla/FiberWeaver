-- Create users table
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    permission_name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
);

-- Create network_objects table
CREATE TABLE IF NOT EXISTS network_objects (
    network_object_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    object_type TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    address TEXT,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS ix_network_objects_id ON network_objects (network_object_id);
CREATE INDEX IF NOT EXISTS ix_network_objects_name ON network_objects (name);
CREATE INDEX IF NOT EXISTS ix_network_objects_address ON network_objects (address);

-- Create cables table
CREATE TABLE IF NOT EXISTS cables (
    cable_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cable_type TEXT NOT NULL,
    fiber_count INTEGER,
    from_object_id INTEGER NOT NULL,
    to_object_id INTEGER NOT NULL,
    distance_km REAL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,
    FOREIGN KEY (from_object_id) REFERENCES network_objects(network_object_id),
    FOREIGN KEY (to_object_id) REFERENCES network_objects(network_object_id)
);

CREATE INDEX IF NOT EXISTS ix_cables_id ON cables (cable_id);
CREATE INDEX IF NOT EXISTS ix_cables_name ON cables (name);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
    connection_id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_object_id INTEGER NOT NULL,
    to_object_id INTEGER NOT NULL,
    cable_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,
    FOREIGN KEY (from_object_id) REFERENCES network_objects(network_object_id),
    FOREIGN KEY (to_object_id) REFERENCES network_objects(network_object_id),
    FOREIGN KEY (cable_id) REFERENCES cables(cable_id)
);

CREATE INDEX IF NOT EXISTS ix_connections_id ON connections (connection_id);

-- Create fiber_splices table
CREATE TABLE IF NOT EXISTS fiber_splices (
    fiber_splices_id INTEGER PRIMARY KEY AUTOINCREMENT,
    cable_id INTEGER NOT NULL,
    fiber_number INTEGER NOT NULL,
    splice_to_fiber INTEGER NOT NULL,
    splice_to_cable_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,
    FOREIGN KEY (cable_id) REFERENCES cables(cable_id),
    FOREIGN KEY (splice_to_cable_id) REFERENCES cables(cable_id)
);

CREATE INDEX IF NOT EXISTS ix_fiber_splices_id ON fiber_splices (fiber_splices_id);

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
    region_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    display_name TEXT,
    country TEXT,
    state TEXT,
    nominatim_id INTEGER UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);

CREATE INDEX IF NOT EXISTS ix_regions_id ON regions (region_id);
CREATE INDEX IF NOT EXISTS ix_regions_name ON regions (name);
CREATE INDEX IF NOT EXISTS ix_regions_nominatim_id ON regions (nominatim_id);

-- Create region_objects junction table (many-to-many)
CREATE TABLE IF NOT EXISTS region_objects (
    region_id INTEGER NOT NULL,
    network_object_id INTEGER NOT NULL,
    PRIMARY KEY (region_id, network_object_id),
    FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE,
    FOREIGN KEY (network_object_id) REFERENCES network_objects(network_object_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_region_objects_region_id ON region_objects (region_id);
CREATE INDEX IF NOT EXISTS ix_region_objects_object_id ON region_objects (network_object_id);

-- Create region_cables junction table (many-to-many)
CREATE TABLE IF NOT EXISTS region_cables (
    region_id INTEGER NOT NULL,
    cable_id INTEGER NOT NULL,
    PRIMARY KEY (region_id, cable_id),
    FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE,
    FOREIGN KEY (cable_id) REFERENCES cables(cable_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_region_cables_region_id ON region_cables (region_id);
CREATE INDEX IF NOT EXISTS ix_region_cables_cable_id ON region_cables (cable_id);
