export const translateGender = (gender: string) => {
  if (gender === 'Female') return '여성';
  if (gender === 'Male') return '남성';
  return gender;
};

export const translatePitch = (pitch: string) => {
  const map: Record<string, string> = {
    'Higher': '고음',
    'Middle': '중음',
    'Lower': '저음',
    'Lower middle': '중저음'
  };
  return map[pitch] || pitch;
};

export const translateCharacteristic = (c: string) => {
  const map: Record<string, string> = {
    'Bright': '밝은', 'Upbeat': '경쾌한', 'Informative': '정보 전달', 'Firm': '단호한',
    'Excitable': '흥분한', 'Youthful': '젊은', 'Breezy': '경쾌한', 'Easy-going': '느긋한',
    'Breathy': '숨소리가 섞인', 'Clear': '명확한', 'Smooth': '부드러운', 'Gravelly': '거친',
    'Soft': '부드러운', 'Even': '차분한', 'Mature': '성숙한', 'Forward': '적극적인',
    'Friendly': '친근한', 'Casual': '캐주얼한', 'Lively': '활기찬', 'Knowledgeable': '지적인',
    'Warm': '따뜻한', 'Enthusiastic': '열정적인', 'Young Adult': '청년', 'Young adult': '청년',
    'Clear Articulation': '명확한 발음', 'Clear articulation': '명확한 발음',
    'General American Accent': '일반 미국 억양', 'American Accent': '미국 억양', 'American accent': '미국 억양',
    'Approachable': '다가가기 쉬운', 'Deep': '깊은', 'Calm': '차분한', 'Resonant': '울림이 있는',
    'Professional': '전문적인', 'Optimistic': '낙관적인', 'Inquisitive': '호기심 많은', 'Mid-30s': '30대 중반',
    'Articulate': '또렷한', 'Energetic': '에너지 넘치는', 'Engaging': '매력적인', 'Encouraging': '격려하는',
    'Confident': '자신감 있는', 'Motivating': '동기를 부여하는', 'Inviting': '매력적인', 'Adult (30s-40s)': '성인 (30-40대)',
    'Sophisticated': '세련된', 'deep': '깊은', 'resonant': '울림이 있는', 'sophisticated': '세련된',
    'confident': '자신감 있는', 'articulate': '또렷한', 'Clear enunciation': '명확한 발음'
  };
  return map[c] || c;
};
