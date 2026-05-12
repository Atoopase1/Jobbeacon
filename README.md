# JobBeacon - Ghana-Focused Job Board

A modern, startup-quality job board web application focused on the Ghanaian market. Built with vanilla HTML, CSS, JavaScript, and Supabase.

## Features
- **Premium UI/UX**: Inspired by modern SaaS and job platforms.
- **Dark/Light Mode**: Full theme support with system preference detection.
- **Dynamic Data**: Jobs fetched and filtered from Supabase.
- **Admin Dashboard**: Manage job listings (Create, Read, Update, Delete).
- **Authentication**: Secure email/password login for admins via Supabase Auth.
- **Responsive Design**: Mobile-first approach for all screens.

## Project Structure
This is a pure HTML/CSS/JS project requiring no build steps.

```
/
├── index.html              # Landing page
├── netlify.toml            # Netlify configuration
├── assets/
│   ├── css/
│   │   ├── style.css       # Global styles and design system
│   │   └── dashboard.css   # Admin dashboard specific styles
│   └── js/
│       ├── app.js          # Core utilities, theme toggle, Supabase client
│       ├── auth.js         # Authentication logic
│       ├── jobs.js         # Job fetching, filtering, and rendering logic
│       └── dashboard.js    # Admin CRUD operations
├── pages/
│   ├── jobs.html           # Job listings with filters and pagination
│   ├── job-details.html    # Single job view
│   ├── login.html          # Admin login page
│   └── dashboard.html      # Protected admin dashboard
└── supabase/
    └── schema.sql          # Database schema, RLS policies, and seed data
```

## Setup Instructions

### 1. Supabase Setup
1. Create a new project on [Supabase](https://supabase.com).
2. Go to the SQL Editor in your Supabase dashboard.
3. Copy the contents of `supabase/schema.sql` and run the query to create tables, policies, and seed data.
4. Go to **Authentication > Users** and create an admin user (email/password) to access the dashboard.
5. Go to **Project Settings > API** and copy your `Project URL` and `anon public key`.

### 2. Application Setup
1. Open `assets/js/app.js`.
2. Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase credentials.
   *(Note: In a real production scenario with a build step, these should be environment variables, but for this vanilla JS demo, they are placed in the JS file. Because RLS is enabled, the anon key is safe to expose.)*

### 3. Local Development
Since this uses ES modules (`type="module"`), you cannot run it directly from the file system (`file://`). You need a local server.

Using Python:
```bash
python -m http.server 8000
```

Using Node.js (npx):
```bash
npx serve .
```

Then visit `http://localhost:8000` or `http://localhost:3000`.

## Deployment to Netlify

This project is configured for continuous deployment on Netlify.

1. Push your code to a GitHub repository.
2. Log in to [Netlify](https://netlify.com) and click **Add new site > Import an existing project**.
3. Connect your GitHub account and select the repository.
4. Netlify will automatically detect the `netlify.toml` file. No build command or publish directory changes are necessary.
5. Click **Deploy site**.

## Branding & Colors

- **Primary**: Deep Emerald Green (`#0F766E`)
- **Secondary**: Gold Accent (`#F59E0B`)
- **Typography**: Inter (Google Fonts)

## License
MIT
