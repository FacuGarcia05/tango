INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'rpg'
WHERE g.slug = 'the-witcher-3'
ON CONFLICT DO NOTHING;

INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'action'
WHERE g.slug = 'the-witcher-3'
ON CONFLICT DO NOTHING;

INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'adventure'
WHERE g.slug = 'the-witcher-3'
ON CONFLICT DO NOTHING;

INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'rpg'
WHERE g.slug = 'tw3-blood-and-wine'
ON CONFLICT DO NOTHING;

INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'action'
WHERE g.slug = 'tw3-blood-and-wine'
ON CONFLICT DO NOTHING;

INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'adventure'
WHERE g.slug = 'tw3-blood-and-wine'
ON CONFLICT DO NOTHING;

INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'indie'
WHERE g.slug = 'hollow-knight'
ON CONFLICT DO NOTHING;

INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'action'
WHERE g.slug = 'hollow-knight'
ON CONFLICT DO NOTHING;

INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'adventure'
WHERE g.slug = 'hollow-knight'
ON CONFLICT DO NOTHING;

INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'indie'
WHERE g.slug = 'celeste'
ON CONFLICT DO NOTHING;

INSERT INTO game_genres (game_id, genre_id)
SELECT g.id, gg.id
FROM games g
JOIN genres gg ON gg.slug = 'action'
WHERE g.slug = 'celeste'
ON CONFLICT DO NOTHING;

INSERT INTO game_platforms (game_id, platform_id)
SELECT g.id, pp.id
FROM games g
JOIN platforms pp ON pp.slug = 'pc'
WHERE g.slug IN ('the-witcher-3', 'tw3-blood-and-wine', 'hollow-knight', 'celeste')
ON CONFLICT DO NOTHING;

INSERT INTO game_platforms (game_id, platform_id)
SELECT g.id, pp.id
FROM games g
JOIN platforms pp ON pp.slug = 'ps5'
WHERE g.slug IN ('the-witcher-3', 'tw3-blood-and-wine')
ON CONFLICT DO NOTHING;

INSERT INTO game_platforms (game_id, platform_id)
SELECT g.id, pp.id
FROM games g
JOIN platforms pp ON pp.slug = 'xbox'
WHERE g.slug IN ('the-witcher-3', 'tw3-blood-and-wine')
ON CONFLICT DO NOTHING;

INSERT INTO game_platforms (game_id, platform_id)
SELECT g.id, pp.id
FROM games g
JOIN platforms pp ON pp.slug = 'switch'
WHERE g.slug IN ('hollow-knight', 'celeste')
ON CONFLICT DO NOTHING;
