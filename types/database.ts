export interface Profile {
  id: string;
  phone?: string;
  name: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  city?: string;
  smoking: boolean;
  drinking: boolean;
  profile_photo?: string;
  onboarding_completed: boolean;
  is_premium: boolean;
  daily_proposals_sent: number;
  daily_super_likes_used: number;
  last_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface Interest {
  id: string;
  name: string;
  category: string;
  icon?: string;
  created_at: string;
}

export interface Proposal {
  id: string;
  creator_id: string;
  activity_name: string;
  interest_id?: string;
  city: string;
  is_boosted: boolean;
  boost_expires_at?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ProposalRequest {
  id: string;
  proposal_id: string;
  requester_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  is_super_like: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  proposal_id: string;
  user1_id: string;
  user2_id: string;
  matched_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}
