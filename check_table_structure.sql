-- 현재 테이블 구조 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'quality_non_audit_performance' 
ORDER BY ordinal_position;
