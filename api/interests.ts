import { supabase } from '@/lib/supabase';

export interface Interest {
  id: string;
  name: string;
}

export const interestsAPI = {
  // Tüm ilgi alanlarını getir
  getAll: async () => {
    const { data, error } = await supabase
      .from('interests')
      .select('id, name')
      .order('name');

    if (error) throw error;
    return data as Interest[];
  },
};
