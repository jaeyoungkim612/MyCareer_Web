-- Monitoring 테이블도 3개 카테고리로 업데이트
UPDATE quality_monitoring 
SET type = 'Quality향상' 
WHERE type = '신규';

UPDATE quality_monitoring 
SET type = '효율화계획' 
WHERE type = '기존';

-- CHECK constraint 업데이트
ALTER TABLE quality_monitoring DROP CONSTRAINT IF EXISTS check_monitoring_type;
ALTER TABLE quality_monitoring ADD CONSTRAINT check_monitoring_type 
CHECK (type IN ('none', 'Quality향상', '효율화계획', '신상품개발'));

-- 확인용 쿼리
SELECT DISTINCT type FROM quality_monitoring;
