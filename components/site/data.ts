// Shared content for the public site. Numbers are sample figures for the design.

export const IMPACT = [
  { value: "12.4K", label: "Citizens taking part", icon: "people" },
  { value: "2,450", label: "Reports resolved", icon: "check" },
  { value: "1,420", label: "Trees planted", icon: "leaf" },
  { value: "7,090 kg", label: "Waste collected", icon: "bin" },
  { value: "38", label: "Wards covered in Dhaka", icon: "pin" },
  { value: "120+", label: "Community missions", icon: "flag" },
];

export const AREAS = [
  { n: "01", title: "Clean air", text: "Live AQI for your neighbourhood, with simple advice for runs, school runs and commutes.", art: "smog" },
  { n: "02", title: "Flood readiness", text: "Ward-level flood risk and pre-monsoon drain checks before the rains arrive.", art: "flood" },
  { n: "03", title: "Waste & recycling", text: "Flag illegal dumping, find recycling points and join clean-up drives.", art: "bins" },
  { n: "04", title: "Urban greening", text: "Plant and care for trees in parks, schoolyards and roadsides across the city.", art: "planting" },
];

export const PROGRAMMES = [
  {
    status: "Ongoing",
    title: "Green Mirpur Drive",
    mission: "green-mirpur",
    place: "Mirpur, Dhaka",
    text: "Planting 2,000 native saplings with schools and residents' associations.",
    progress: 60,
    art: "hands",
  },
  {
    status: "Ongoing",
    title: "Pre-monsoon Drain Check",
    mission: "drain-check",
    place: "12 wards, Dhaka",
    text: "Mapping and clearing blocked drains before the monsoon floods.",
    progress: 45,
    art: "flood",
  },
  {
    status: "Upcoming",
    title: "Kailshi Canal Clean-up",
    mission: "kailshi-canal",
    place: "Kailshi, Dhaka",
    text: "A week of volunteer days to lift plastic from the canal and its banks.",
    progress: 0,
    art: "litter",
  },
  {
    status: "Completed",
    title: "Say No to Polythene Week",
    mission: "polythene-week",
    place: "Citywide",
    text: "700 households pledged to cut single-use polythene for a week.",
    progress: 100,
    art: "bottles",
  },
  {
    status: "Completed",
    title: "Clean Air Schools",
    place: "Dhanmondi & Mohammadpur",
    text: "Air-quality alerts and mask drives for 14 schools in winter smog season.",
    progress: 100,
    art: "sky",
  },
  {
    status: "Upcoming",
    title: "Rooftop Gardens Pilot",
    place: "Uttara, Dhaka",
    text: "Helping 50 buildings start rooftop gardens to cool streets and grow food.",
    progress: 0,
    art: "sprouts",
  },
];

export const STORIES = [
  {
    slug: "read-dhaka-aqi",
    date: "Nov 2, 2026",
    tag: "Air",
    title: "Winter smog is back: how to read Dhaka’s AQI",
    text: "What the numbers mean, and when to move your morning run indoors.",
    art: "smog",
    body: [
      "Every winter, Dhaka’s air gets noticeably worse. Dry weather, brick kilns restarting after the monsoon, construction dust and traffic all add fine particles (PM2.5) to the air, and cooler, still nights trap them close to the ground.",
      "The Air Quality Index (AQI) turns those readings into one number. 0–50 is good. 51–100 is moderate. 101–150 is unhealthy for sensitive groups — people with asthma, heart or lung conditions, children, older adults and pregnant women. 151–200 is unhealthy for everyone, and anything above 200 is very unhealthy.",
      "What to do: check the AQI before you head out, especially early in the morning when it is often worst. On days above 150, move exercise indoors, keep windows closed during peak traffic, and wear a well-fitted N95 mask outside — cloth masks do little against PM2.5.",
      "EcoPulse shows the live AQI for your area at the top of every app page, and the assistant can tell you whether it is a good time to be outside. For official health advisories, follow the Department of Environment.",
    ],
  },
  {
    slug: "green-mirpur-afternoon",
    date: "Oct 18, 2026",
    tag: "Community",
    title: "40 neighbours, 120 saplings, one afternoon",
    text: "Inside the Green Mirpur drive and the residents who organised it.",
    art: "cleanup",
    body: [
      "It started with one post in the Green Mirpur community: a resident had found an empty strip along a school wall and asked if anyone wanted to plant trees there.",
      "Within a week the mission had a date, a ward-office permission slip, and a supplier for native saplings — neem, jarul, krishnachura and mango. Forty neighbours turned up on the day, from schoolchildren to retirees.",
      "By sunset, 120 saplings were in the ground, each one tagged and mapped in the app so volunteers can sign up to water them through the dry months.",
      "Want to do the same on your street? Use Organizer tools in the app to create a mission. We will help you with the checklist, from permissions to aftercare.",
    ],
  },
  {
    slug: "shewrapara-drains",
    date: "Sep 30, 2026",
    tag: "Flood",
    title: "Three drains that kept Shewrapara dry this monsoon",
    text: "How citizen reports turned into ward action before the rains.",
    art: "flood",
    body: [
      "Waterlogging in West Shewrapara used to be a yearly ritual. This year, residents tried something different: they walked their lanes in April and reported every blocked drain they could find.",
      "Three of those reports — at a market corner, behind a mosque and beside a primary school — were verified by neighbours within a day and forwarded to the ward office, which cleared them before the first heavy rains.",
      "When the monsoon arrived, those three lanes drained in hours instead of days. The ward team now uses EcoPulse reports to plan its pre-monsoon cleaning route.",
      "The lesson: small, specific reports with a clear photo and location get fixed. If you see a blocked drain, report it — and ask a neighbour to verify it.",
    ],
  },
];
