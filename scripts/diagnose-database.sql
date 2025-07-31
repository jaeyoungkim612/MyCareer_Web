-- 현재 연결된 데이터베이스 정보 확인
SELECT 
  'Database Connection Info' as info_type,
  current_database() as database_name,
  current_user as current_user,
  version() as postgresql_version;

-- 현재 존재하는 테이블 목록 확인
SELECT 
  'Existing Tables' as info_type,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- business_goals 테이블 구조 확인 (존재하는 경우)
SELECT 
  'business_goals Table Structure' as info_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'business_goals' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- self_assessment_scores 테이블 구조 확인 (존재하는 경우)
SELECT 
  'self_assessment_scores Table Structure' as info_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'self_assessment_scores' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 각 테이블의 레코드 수 확인
SELECT 
  'Record Counts' as info_type,
  'business_goals' as table_name,
  COUNT(*) as record_count
FROM business_goals
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'business_goals' AND table_schema = 'public'
);

SELECT 
  'Record Counts' as info_type,
  'self_assessment_scores' as table_name,
  COUNT(*) as record_count
FROM self_assessment_scores
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'self_assessment_scores' AND table_schema = 'public'
);
