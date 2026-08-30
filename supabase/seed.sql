-- ARKOS — Données initiales pour Supabase
-- À exécuter une seule fois après le schéma (Supabase Studio → SQL Editor).
--
-- Compte administrateur par défaut :
--   email    : admin@arkos.local
--   mot de passe : change-le via le panneau /admin après la première connexion,
--                 mais avant cela configure ADMIN_PASSWORD != 'arkosadmin' dans les
--                 variables d'environnement Vercel pour désactiver le seed ci-dessous.

insert into public.users (name, email, password_hash, role, created_at, last_login) values
    ('Admin', 'admin@arkos.local', 'scrypt:32768:8:1$7IoQZdVhWRIA4AAp$a4267d1d4572255873100ebb029ba44cbfc328e4373bc60a84cdaf8f3cc03e516af76bbaa68b45ca95473409b55ffbb89bc9e89560936ff9445bad0ba2b70be6', 'admin', now(), now()),
    ('Martin', 'martin@arkos.local', 'scrypt:32768:8:1$o6cFOy8cDNdshz3I$c1df685abb145e2853595bb0e3e6edca9f12411591afb388e7d10ec2c0adc414258be726cb9faac7a40b9a159e7a4940baef8703b4b65720bec7a6e8a5caf106', 'staff', now(), now());

insert into public.vote_sites (id, name, reward, reward_command, link, status, cooldown_minutes)
overriding system value
values
    (1, 'Serveur Privé', '250 ⛃ + 1 caisse vote', 'ar vote {player} 250', 'https://serveur-prive.net/', 'Disponible', 90),
    (2, 'Serveurs Minecraft', '500 ⛃ + 2 points boutique', 'ar vote {player} 500', 'https://www.serveursminecraft.org/', 'Disponible', 180),
    (3, 'Serveur-Minecraft.com', '750 ⛃ + chance de clé rare', 'ar vote {player} 750', 'https://serveur-minecraft.com/', 'Disponible', 1440);

insert into public.server_status (id, online, version, players_online, players_max, bedrock_port, uptime, cpu, ram, storage, motd, updated_at)
overriding system value
values
    (1, 1, '1.21.8', 128, 300, '19132', '14j 06h', 42, 68, 57, 'ARKOS • Économie • Guildes • Quêtes • Monde personnalisé', now());

-- Grades (rangs) initiaux
insert into public.grades (id, name, color, price, benefits, permissions)
overriding system value
values
    (1, 'Membre', '#F0FDF4', 0, 'Accès au serveur', '[]'),
    (2, 'Titan', '#22C55E', 19.99, 'Grade premium', '["flights","nick","kit.titan"]'),
    (3, 'Souverain', '#86EFAC', 39.99, 'Grade ultime', '["flights","nick","kit.sovereign","vip"]');

-- Quelques produits boutique
insert into public.products (id, category, name, description, price, discount, image)
overriding system value
values
    (1, 'Rangs', 'Grade Titan', 'Grade premium pour 1 mois.', 19.99, 0, NULL),
    (2, 'Rangs', 'Grade Souverain', 'Grade ultime pour 1 mois.', 39.99, 10, NULL),
    (3, 'Cosmétiques', 'Kit Démarrage', 'Un kit pour bien démarrer.', 4.99, 0, NULL);
