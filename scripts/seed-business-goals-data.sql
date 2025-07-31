-- 샘플 데이터 삽입
INSERT INTO business_goals (
  employee_id,
  business_goal,
  new_audit_count,
  new_audit_amount,
  hourly_revenue,
  ui_revenue_count,
  ui_revenue_amount,
  non_audit_hourly_revenue,
  audit_adjusted_em,
  non_audit_adjusted_em
) VALUES (
  'EMP001',
  '전체 비즈니스 매출을 15% 증가시키는 것을 목표로 하며, 감사 고객 기반 확대와 높은 재계약률 유지에 중점을 둡니다. 비감사 서비스의 경우 고부가가치 컨설팅 업무를 우선적으로 추진하여 수익성을 극대화하고, 기존 고객과의 관계를 강화하여 교차 판매 기회를 확대할 계획입니다.',
  2,
  300000000,
  90000,
  4,
  600000000,
  110000,
  120,
  80
) ON CONFLICT DO NOTHING;
