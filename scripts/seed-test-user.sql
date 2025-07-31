-- 테스트용 사용자 데이터 추가
INSERT INTO local_auth (
    empno,
    empnm,
    pwc_id,
    org_nm,
    gradnm,
    cm_nm,
    job_info_nm,
    is_verified,
    verification_token,
    token_expires_at,
    last_login,
    created_at,
    updated_at
) VALUES (
    '270767',
    '김재동',
    'jaedong.kim@pwc.com',
    'Assurance DA',
    'Partner',
    'Digital Assurance',
    'Human Capital',
    true,
    null,
    null,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (empno) DO UPDATE SET
    empnm = EXCLUDED.empnm,
    pwc_id = EXCLUDED.pwc_id,
    org_nm = EXCLUDED.org_nm,
    gradnm = EXCLUDED.gradnm,
    cm_nm = EXCLUDED.cm_nm,
    job_info_nm = EXCLUDED.job_info_nm,
    is_verified = EXCLUDED.is_verified,
    last_login = EXCLUDED.last_login,
    updated_at = CURRENT_TIMESTAMP;

-- 확인
SELECT * FROM local_auth WHERE empno = '270767';
