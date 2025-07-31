-- 수파베이스에서 실행할 SQL 스크립트

-- 1. 로컬 인증 테이블 생성
CREATE TABLE IF NOT EXISTS local_auth (
    id SERIAL PRIMARY KEY,
    empno VARCHAR(20) UNIQUE NOT NULL,
    empnm VARCHAR(100) NOT NULL,
    pwc_id VARCHAR(255) NOT NULL,
    org_nm VARCHAR(200),
    gradnm VARCHAR(100),
    cm_nm VARCHAR(100),
    job_info_nm VARCHAR(200),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100),
    token_expires_at TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_local_auth_empno ON local_auth(empno);
CREATE INDEX IF NOT EXISTS idx_local_auth_token ON local_auth(verification_token);
CREATE INDEX IF NOT EXISTS idx_local_auth_verified ON local_auth(is_verified);

-- 3. RLS 활성화
ALTER TABLE local_auth ENABLE ROW LEVEL SECURITY;

-- 4. 정책 생성 (개발용 - 모든 접근 허용)
DROP POLICY IF EXISTS "Enable all access for local_auth" ON local_auth;
CREATE POLICY "Enable all access for local_auth" ON local_auth FOR ALL USING (true);

-- 5. 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. 트리거 생성
DROP TRIGGER IF EXISTS update_local_auth_updated_at ON local_auth;
CREATE TRIGGER update_local_auth_updated_at 
    BEFORE UPDATE ON local_auth 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 테스트 확인
SELECT 'local_auth table created successfully' as status;
