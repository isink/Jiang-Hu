-- ==========================================
-- JIANGHU APP SEED DATA
-- Core locations data extracted from frontend mocks
-- Run this to populate your empty 'locations' table
-- ==========================================

insert into public.locations (id, title, category, description, tips, transport, tags, image_url)
values 
(
  '01', 
  'HONGYA CAVE', 
  'SIGHTSEEING', 
  'A real-life ''Spirited Away'' bathhouse. This 11-story stilt house complex clings to a cliffside along the Jialing River. A masterpiece of Bayu architecture, it''s a vertical maze of shops, bars, and restaurants.', 
  ARRAY['Best View: Qiansimen Bridge or across the river.', 'Lights on: Approx 19:30 - 23:00.', 'Crowd Alert: Extremely busy on holidays. 11th floor is street level!'], 
  'Metro Line 1 or 6 to Xiaoshizi Station (Exit 6 or 9). Walk 10 mins towards the river.', 
  ARRAY['#CYBERPUNK', '#NIGHT'],
  'https://raw.githubusercontent.com/wenhandong/jianghu-assets/main/HONGYA_CAVE.jpg' -- Placeholder or update with your Storage URL
),
(
  '02', 
  'YANGTZE CABLEWAY', 
  'TRANSPORT', 
  'The ''Air Bus'' of Chongqing. Gliding across the Yangtze River, this cableway offers a retro, cinematic view of the city''s skyline and the muddy river below.', 
  ARRAY['Sunset is the golden hour.', 'Start from the South Bank (Shangxin Jie) to avoid long queues at Jiefangbei.', 'Book tickets online in advance.'], 
  'North Station: Metro Line 1/6 to Xiaoshizi (Exit 5B). South Station: Metro Line 6 to Shangxin Jie.', 
  ARRAY['#ICONIC', '#RIVER'],
  null
),
(
  '03', 
  'LIZIBA STATION', 
  'TRANSPORT', 
  'The viral ''Train Eating Building''. Line 2 passes straight through a 19-story residential building. A testament to Chongqing''s 8D topography and engineering ingenuity.', 
  ARRAY['Viewing Platform: Exit at Liziba Station, go down to street level.', 'Best time: Morning for better lighting.', 'Don''t miss the ride *inside* the train too.'], 
  'Metro Line 2 to Liziba Station. Take Exit A and walk down to the viewing deck.', 
  ARRAY['#TRAIN', '#VIRAL'],
  null
),
(
  '04', 
  'RAFFLES CITY', 
  'ARCHITECTURE', 
  'The ''Crystal'' sail. A futuristic mega-structure at Chaotianmen, where the two rivers meet. It features a horizontal sky conservatory connecting four towers.', 
  ARRAY['The Exploration Deck offers a glass-bottom view.', 'Great spot for sunset photos of the river confluence.', 'Connects to Chaotianmen Square below.'], 
  'Metro Line 1 to Chaotianmen Station. Direct access to the mall.', 
  ARRAY['#FUTURE', '#SAIL'],
  null
),
(
  '05', 
  'JIEFANGBEI CBD', 
  'URBAN', 
  'The spiritual and commercial heart of Chongqing. The Liberation Monument stands tall amidst a forest of skyscrapers, luxury malls, and neon lights.', 
  ARRAY['Visit at night for the neon glow.', 'Food street nearby (Bayi Road) is a must.', 'Walkable to Hongya Cave.'], 
  'Metro Line 2 to Linjiangmen (Exit B) or Line 1/6 to Xiaoshizi.', 
  ARRAY['#SHOPPING', '#LANDMARK'],
  null
),
(
  '06', 
  'KUIXINGLOU', 
  'URBAN', 
  'The ultimate 8D city experience. A square on the 22nd floor that feels like the ground floor. A filming location for ''Better Days'', featuring dizzying skybridges.', 
  ARRAY['Located near Jiefangbei.', 'Don''t trust 2D maps; look for vertical connections.', 'Great for moody, urban photography.'], 
  'Walk from Linjiangmen Station (Line 2) to Datang Square. The plaza is on the 22nd floor.', 
  ARRAY['#22ND_FLOOR', '#8D_CITY'],
  null
),
(
  '07', 
  'CIQIKOU OLD TOWN', 
  'CULTURE', 
  'A porcelain port town turned cultural hub. Cobblestone streets, tea houses, and the famous ''Chen Mahua'' (twisted dough twists). A glimpse into old Chongqing.', 
  ARRAY['Explore the back alleys to escape the main crowd.', 'Try the spicy chicken and fresh tea.', 'Visit Baolun Temple for a quiet moment.'], 
  'Metro Line 1 to Ciqikou Station (Exit 1). Follow the crowd to the entrance.', 
  ARRAY['#HISTORY', '#FOOD'],
  null
),
(
  '08', 
  'DAZU ROCK CARVINGS', 
  'HERITAGE', 
  'A UNESCO World Heritage site. Thousands of religious statues carved into the cliffside, dating back to the 7th century. The ''Thousand-Hand Guanyin'' is breathtaking.', 
  ARRAY['Located in Dazu District (1.5h drive/train).', 'Baodingshan is the main site.', 'Hire a guide or audio guide for history context.'], 
  'High-speed train to Dazu South Station, then Bus 205/207 to the scenic area.', 
  ARRAY['#UNESCO', '#ART'],
  null
),
(
  '09', 
  'WULONG KARST', 
  'NATURE', 
  'Nature''s grand sculpture. Featuring the Three Natural Bridges and vast sinkholes. Filming location for ''Transformers: Age of Extinction'' and ''Curse of the Golden Flower''.', 
  ARRAY['Wear comfortable shoes; lots of walking.', 'Glass skywalk is thrilling.', 'Tianfu Official Post is a must-photo spot.'], 
  'Train to Wulong Station. Take a mini-bus from the station to the Tourist Visitor Center.', 
  ARRAY['#TRANSFORMERS'],
  null
),
(
  '10', 
  'SHIBATI OLD STREET', 
  'CULTURE', 
  'The connector between the upper and lower city. A revitalized stairway district that blends traditional stilt architecture with modern trends. The ''Seven Gates'' of old Chongqing.', 
  ARRAY['Visit at dusk when lanterns light up.', 'Great for finding local snacks and crafts.', 'Connects Jiefangbei (upper) to the river (lower).'], 
  'Metro Line 1 or 2 to Jiaochangkou Station (Exit 3 or 4). Walk downhill.', 
  ARRAY['#MEMORY', '#RETRO'],
  null
)
on conflict (id) do nothing;
