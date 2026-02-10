CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE status_column AS ENUM ('backlog', 'todo', 'in_progress', 'blocked', 'done');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE deliverable_status AS ENUM ('not_started', 'in_progress', 'done');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  display_name text,
  timezone text NOT NULL DEFAULT 'Europe/Stockholm',
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE profiles
  ADD CONSTRAINT profiles_auth_user_fk
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS projects_owner_unique ON projects(owner_id);
DO $$ BEGIN
  ALTER TABLE projects
  ADD CONSTRAINT projects_date_order_check CHECK (start_date <= end_date);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  color_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS phases_project_order_unique ON phases(project_id, order_index);

CREATE TABLE IF NOT EXISTS deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES phases(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date date,
  status deliverable_status NOT NULL DEFAULT 'not_started',
  resource_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id uuid NOT NULL REFERENCES phases(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  status_column status_column NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  start_at date NOT NULL,
  end_at date NOT NULL,
  column_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE tasks
  ADD CONSTRAINT tasks_date_order_check CHECK (start_at <= end_at);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS task_deliverables (
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  deliverable_id uuid NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, deliverable_id)
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tasks_updated_at ON tasks;
CREATE TRIGGER set_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS projects_all_own ON projects;
CREATE POLICY projects_all_own ON projects
FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS phases_all_own ON phases;
CREATE POLICY phases_all_own ON phases
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = phases.project_id
      AND p.owner_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = phases.project_id
      AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS deliverables_all_own ON deliverables;
CREATE POLICY deliverables_all_own ON deliverables
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = deliverables.project_id
      AND p.owner_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = deliverables.project_id
      AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS tasks_all_own ON tasks;
CREATE POLICY tasks_all_own ON tasks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = tasks.project_id
      AND p.owner_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = tasks.project_id
      AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS task_deliverables_all_own ON task_deliverables;
CREATE POLICY task_deliverables_all_own ON task_deliverables
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = task_deliverables.task_id
      AND p.owner_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = task_deliverables.task_id
      AND p.owner_id = auth.uid()
  )
);
