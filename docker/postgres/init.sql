CREATE TABLE IF NOT EXISTS sensor_readings (
    id           SERIAL PRIMARY KEY,
    machine_id   VARCHAR(50)  NOT NULL,
    machine_type VARCHAR(50)  NOT NULL,
    temperature  FLOAT        NOT NULL,
    humidity     FLOAT        NOT NULL,
    vibration    FLOAT        NOT NULL,
    belt_speed   FLOAT        NOT NULL,
    defect_count INT          DEFAULT 0,
    fault        VARCHAR(100),
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rca_results (
    id          SERIAL PRIMARY KEY,
    machine_id  VARCHAR(50)  NOT NULL,
    problem     TEXT         NOT NULL,
    cause       TEXT         NOT NULL,
    evidence    TEXT,
    action      TEXT         NOT NULL,
    severity    VARCHAR(20)  NOT NULL,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id          SERIAL PRIMARY KEY,
    machine_id  VARCHAR(50) NOT NULL,
    rca_id      INT         REFERENCES rca_results(id),
    sent_to     VARCHAR(50),
    sent_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast time-range queries per machine
CREATE INDEX IF NOT EXISTS idx_sensor_machine_time
    ON sensor_readings (machine_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rca_machine_time
    ON rca_results (machine_id, created_at DESC);