-- ---------------------------------------------------------------------------
-- Lead Capture System — demo seed data
--
-- Two tenants on purpose: one to demo, one to prove isolation. Log in as the
-- owner of either and you must never see the other's leads. See
-- docs/TENANT_ISOLATION_TEST.md for the check.
--
-- Safe to re-run: every insert is keyed on a fixed UUID with `do nothing`.
-- Photo URLs point at Unsplash and are placeholders for the demo only —
-- real tenants upload into the `leadcapture-photos` bucket.
-- ---------------------------------------------------------------------------

-- Tenant A ------------------------------------------------------------------
insert into leadcapture.businesses (
  id, slug, name, tagline, about, primary_color, secondary_color,
  phone, whatsapp_number, email, service_area, hours, google_review_link
) values (
  '11111111-1111-4111-8111-111111111111',
  'table-mountain-plumbing',
  'Table Mountain Plumbing',
  'Burst pipe? Blocked drain? We are there today.',
  'Family-run plumbers working the Southern Suburbs since 2009. Fully insured, '
  || 'upfront pricing, and we clean up before we leave. No call-out fee for '
  || 'quotes booked online.',
  '#0f766e', '#111827',
  '+27 21 555 0142', '27825550142', 'jobs@tmplumbing.co.za',
  'Southern Suburbs, City Bowl & Atlantic Seaboard',
  '{"mon_fri": "07:00 - 17:00", "sat": "08:00 - 13:00", "sun": "Emergencies only", "emergency": "24/7 for burst pipes"}'::jsonb,
  'https://g.page/r/example-tm-plumbing/review'
) on conflict (id) do nothing;

insert into leadcapture.services (id, business_id, name, description, starting_price, sort_order) values
  ('a1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Burst pipe / emergency leak', 'Same-day isolation and repair. We stop the water first, quote second.', 850, 1),
  ('a1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'Blocked drain clearing', 'High-pressure jetting and camera inspection for stubborn blockages.', 650, 2),
  ('a1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'Geyser repair & replacement', 'Repair, replace or relocate. All work comes with a COC certificate.', 2400, 3),
  ('a1000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111',
   'Bathroom & kitchen installs', 'Taps, mixers, toilets and full renovations.', 1200, 4)
on conflict (id) do nothing;

insert into leadcapture.testimonials (id, business_id, customer_name, quote, rating, sort_order) values
  ('b1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Nandi M., Claremont',
   'Geyser burst at 6am on a Sunday. They answered, arrived within the hour, and the quote was exactly what they said on the phone.', 5, 1),
  ('b1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'Pieter V., Observatory',
   'Third plumber I called and the only one who actually showed up when they said they would. Drain has been clear for eight months.', 5, 2),
  ('b1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'Fatima S., Rondebosch',
   'Neat, polite and they took their shoes off without being asked. Small thing, but it says a lot.', 4, 3)
on conflict (id) do nothing;

insert into leadcapture.faqs (id, business_id, question, answer, sort_order) values
  ('c1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Do you charge a call-out fee?',
   'No call-out fee if you book the quote through this page. For emergency after-hours work there is a R450 after-hours surcharge, which we tell you before we dispatch.', 1),
  ('c1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'How fast can you get here?',
   'For emergencies in our service area we aim for under 90 minutes. For standard bookings we usually offer a slot the next working day.', 2),
  ('c1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'Do you issue a COC certificate?',
   'Yes. All geyser and plumbing work is issued with a Certificate of Compliance, which your insurer will ask for.', 3),
  ('c1000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111',
   'Which areas do you cover?',
   'Southern Suburbs, the City Bowl and the Atlantic Seaboard. Message us if you are just outside — we will tell you honestly if we can help.', 4)
on conflict (id) do nothing;

insert into leadcapture.work_photos (id, business_id, image_url, caption, sort_order) values
  ('d1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=70', 'Full bathroom re-pipe in Newlands', 1),
  ('d1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=70', 'Geyser swap-out, Kenilworth', 2),
  ('d1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=70', 'Outside tap and irrigation line', 3)
on conflict (id) do nothing;

-- Tenant B — exists to prove isolation ---------------------------------------
insert into leadcapture.businesses (
  id, slug, name, tagline, about, primary_color, secondary_color,
  phone, whatsapp_number, email, service_area, hours, google_review_link
) values (
  '22222222-2222-4222-8222-222222222222',
  'atlantic-sparks',
  'Atlantic Sparks Electrical',
  'Certified electricians. Load-shedding ready.',
  'Master Electricians registered with the ECA. Inverter and solar-ready '
  || 'installs, COC certificates, and fault-finding that actually finds the fault.',
  '#1d4ed8', '#0b1220',
  '+27 21 555 0198', '27835550198', 'hello@atlanticsparks.co.za',
  'Atlantic Seaboard, CBD & Northern Suburbs',
  '{"mon_fri": "07:30 - 16:30", "sat": "By appointment", "sun": "Closed", "emergency": "24/7 electrical faults"}'::jsonb,
  'https://g.page/r/example-atlantic-sparks/review'
) on conflict (id) do nothing;

insert into leadcapture.services (id, business_id, name, description, starting_price, sort_order) values
  ('a2000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'Inverter & battery install', 'Sized to your actual usage, not a sales target.', 18500, 1),
  ('a2000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'Electrical fault finding', 'Tripping DB board, dead plugs, mystery power drains.', 750, 2),
  ('a2000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222',
   'COC certificate inspection', 'Required for property transfer. Same-week slots.', 1450, 3)
on conflict (id) do nothing;

insert into leadcapture.testimonials (id, business_id, customer_name, quote, rating, sort_order) values
  ('b2000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'Themba K., Sea Point',
   'Explained exactly what the inverter would and would not run before quoting. No overselling.', 5, 1),
  ('b2000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'Carla D., Green Point',
   'Found a fault two other electricians missed. Fixed in one visit.', 5, 2)
on conflict (id) do nothing;

insert into leadcapture.faqs (id, business_id, question, answer, sort_order) values
  ('c2000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'Can you quote an inverter over the phone?',
   'We can give a rough range, but we insist on seeing your DB board and last three bills before a firm quote. Undersized systems are the number one complaint in this industry.', 1),
  ('c2000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'Are you registered?',
   'Yes — ECA registered and every job is signed off with a COC.', 2),
  ('c2000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222',
   'Do you do after-hours callouts?',
   'For genuine electrical faults, yes, 24/7. Installations are booked during business hours.', 3)
on conflict (id) do nothing;

insert into leadcapture.work_photos (id, business_id, image_url, caption, sort_order) values
  ('d2000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=70', '8kW inverter install, Sea Point', 1),
  ('d2000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=70', 'DB board rebuild, Century City', 2)
on conflict (id) do nothing;

-- Sample leads so the dashboard is not an empty shell on first login ---------
insert into leadcapture.leads (
  id, business_id, customer_name, phone, whatsapp, email, service_id, location,
  urgency, description, preferred_contact, status, quote_amount, follow_up_date,
  notes, created_at
) values
  ('e1000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Sarah Adams', '+27 82 555 0110', '27825550110', 'sarah.adams@example.co.za',
   'a1000000-0000-4000-8000-000000000001', 'Newlands',
   'emergency', 'Pipe burst under the kitchen sink, water everywhere. Mains is off for now.',
   'call', 'new', null, null, null, now() - interval '2 hours'),

  ('e1000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'Johan Botha', '+27 83 555 0121', '27835550121', 'jbotha@example.co.za',
   'a1000000-0000-4000-8000-000000000002', 'Observatory',
   'high', 'Shower drains very slowly and smells. Probably roots again.',
   'whatsapp', 'contacted', null, null,
   'Called back — available Thursday morning.', now() - interval '1 day'),

  ('e1000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111',
   'Lerato Dube', '+27 84 555 0132', null, 'lerato.d@example.co.za',
   'a1000000-0000-4000-8000-000000000003', 'Rondebosch',
   'medium', 'Geyser is 14 years old, want to replace before it fails.',
   'email', 'quote_sent', 6800, current_date + 3,
   'Quoted 150L Kwikot incl. COC. Comparing with one other quote.', now() - interval '3 days'),

  ('e1000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111',
   'Mark Petersen', '+27 82 555 0143', '27825550143', null,
   'a1000000-0000-4000-8000-000000000004', 'Claremont',
   'low', 'Two leaking mixer taps in the main bathroom.',
   'whatsapp', 'booked', 1450, current_date + 1,
   'Booked for Friday 09:00. Parts already ordered.', now() - interval '5 days'),

  ('e1000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111',
   'Aisha Khan', '+27 81 555 0154', null, 'aisha.k@example.co.za',
   'a1000000-0000-4000-8000-000000000002', 'Wynberg',
   'medium', 'Outside drain overflowing after the rain.',
   'call', 'completed', 950, null,
   'Cleared and jetted. Invoiced and paid.', now() - interval '12 days'),

  ('e2000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
   'Daniel Fourie', '+27 82 555 0210', '27825550210', 'dfourie@example.co.za',
   'a2000000-0000-4000-8000-000000000001', 'Sea Point',
   'medium', 'Want a quote for an inverter that runs the fridge, wifi and lights.',
   'whatsapp', 'new', null, null, null, now() - interval '5 hours'),

  ('e2000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222',
   'Zanele Mokoena', '+27 83 555 0221', null, 'zanele.m@example.co.za',
   'a2000000-0000-4000-8000-000000000003', 'Green Point',
   'high', 'Need a COC for a property transfer closing in two weeks.',
   'email', 'follow_up', 1450, current_date + 2,
   'Waiting on the conveyancer to confirm the date.', now() - interval '2 days')
on conflict (id) do nothing;
