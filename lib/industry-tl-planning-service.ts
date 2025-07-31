import { supabase } from "./supabase"

export interface IndustryTLPlanning {
  id?: number
  employee_id: string
  goals: string
  thought_leadership_activities: string
  tl_revenue_connection: string
  industry_audit_efficiency: string
  industry_specialization_participation: string
  new_service_development: string
  status?: 'Draft' | '작성중' | '완료'
  created_at?: string
  updated_at?: string
}

export class IndustryTLPlanningService {
  static async getByEmployeeId(employee_id: string): Promise<IndustryTLPlanning | null> {
    const { data, error } = await supabase
      .from("industry_tl_planning")
      .select("*")
      .eq("employee_id", employee_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  }

  static async upsertPlanning(planning: Omit<IndustryTLPlanning, "id" | "created_at">): Promise<IndustryTLPlanning | null> {
    const { data, error } = await supabase
      .from("industry_tl_planning")
      .insert(planning)
      .select()
      .maybeSingle();
    console.log("insert result", { data, error });
    if (error) throw error; // error 메시지 노출
    if (!data) throw new Error("No data returned from insert"); // data가 없을 때도 에러
    return data;
  }

  static async updateSpecificFields(employee_id: string, changes: Partial<IndustryTLPlanning>): Promise<IndustryTLPlanning | null> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("industry_tl_planning")
      .update({ ...changes, updated_at: now })
      .eq("employee_id", employee_id)
      .select()
      .maybeSingle();
    if (error || !data) return null;
    return data;
  }
} 