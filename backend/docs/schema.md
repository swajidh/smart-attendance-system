# Database schema (initial)

## users

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| email | string | unique |
| hashed_password | string | bcrypt |
| full_name | string | |
| role | enum | admin, teacher, student |
| student_id | string | optional external matric number |
| is_active | bool | |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz | soft delete |

## attendance_sessions

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| course_code | string | indexed |
| room | string | optional |
| status | enum | scheduled, active, closed |
| started_at, closed_at | timestamptz | |
| created_by_id | UUID | FK → users |

## attendance_records

| Column | Type | Notes |
|--------|------|--------|
| id | UUID | PK |
| session_id | UUID | FK → attendance_sessions |
| student_id | UUID | FK → users |
| status | enum | present, late, absent |
| marked_at | timestamptz | |
| source | string | manual, cnn, etc. |
| confidence | float | optional ML score |
| notes | text | optional |
