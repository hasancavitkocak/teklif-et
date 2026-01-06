/*
  # Add notification helper functions
  
  1. Functions
    - get_unviewed_proposal_count: Kullanıcının tekliflerine gelen görülmemiş etkileşim sayısı
    - mark_user_proposals_as_viewed: Kullanıcının tekliflerine gelen etkileşimleri görüntülendi olarak işaretle
*/

-- Kullanıcının tekliflerine gelen görülmemiş etkileşim sayısını getir
CREATE OR REPLACE FUNCTION get_unviewed_proposal_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM user_interactions ui
    INNER JOIN proposals p ON ui.proposal_id = p.id
    WHERE p.creator_id = p_user_id
      AND ui.interaction_type IN ('like', 'super_like')
      AND ui.is_viewed = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kullanıcının tekliflerine gelen etkileşimleri görüntülendi olarak işaretle
CREATE OR REPLACE FUNCTION mark_user_proposals_as_viewed(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE user_interactions 
  SET is_viewed = true
  WHERE proposal_id IN (
    SELECT id FROM proposals WHERE creator_id = p_user_id
  )
  AND interaction_type IN ('like', 'super_like')
  AND is_viewed = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS politikalarını güncelle - fonksiyonlar için
GRANT EXECUTE ON FUNCTION get_unviewed_proposal_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_user_proposals_as_viewed(UUID) TO authenticated;