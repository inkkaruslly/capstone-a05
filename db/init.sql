CREATE TABLE IF NOT EXISTS ticket_assignments (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL UNIQUE,
    ticket_id VARCHAR(100) NOT NULL,
    customer_id VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    subject TEXT,
    service_queue VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ASSIGNED',
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rejected_messages (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE,
    reason TEXT NOT NULL,
    payload JSONB,
    rejected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_assignments_ticket_id
    ON ticket_assignments(ticket_id);
