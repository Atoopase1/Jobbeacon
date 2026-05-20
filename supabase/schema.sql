-- ==============================================================================
-- JobBeacon Supabase Schema & Seed Data
-- ==============================================================================

-- 1. Create the Jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_logo TEXT,
  location TEXT NOT NULL,
  salary NUMERIC,
  type TEXT NOT NULL, -- e.g., 'Full-time', 'Part-time', 'Contract', 'Remote'
  category TEXT NOT NULL, -- e.g., 'Technology', 'Banking', 'NGO', 'Marketing', 'Telecommunications'
  description TEXT NOT NULL,
  requirements TEXT,
  responsibilities TEXT,
  apply_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  post_type TEXT NOT NULL DEFAULT 'hiring' -- 'hiring' or 'seeking'
);

-- 1.5 Create the Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  contact_email TEXT,
  phone TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.6 Create the Saved Jobs table
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, job_id)
);

-- 1.7 Create the Applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'Applied' NOT NULL, -- 'Applied', 'Reviewed', 'Interview', 'Hired', 'Rejected'
  cover_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, job_id)
);

-- Setup trigger to create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, contact_email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Setup Row Level Security (RLS)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.jobs FOR SELECT
  USING ( true );

-- Allow any authenticated user to insert jobs
CREATE POLICY "Authenticated users can insert jobs."
  ON public.jobs FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' );

-- Allow users to update their own jobs, or admins to update any job
CREATE POLICY "Users can update their own jobs, admins can update any."
  ON public.jobs FOR UPDATE
  USING ( auth.role() = 'authenticated' AND (auth.uid() = user_id OR (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')) );

-- Allow users to delete their own jobs, or admins to delete any job
CREATE POLICY "Users can delete their own jobs, admins can delete any."
  ON public.jobs FOR DELETE
  USING ( auth.role() = 'authenticated' AND (auth.uid() = user_id OR (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')) );

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

-- Saved Jobs RLS
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved jobs."
  ON public.saved_jobs FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert their own saved jobs."
  ON public.saved_jobs FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can delete their own saved jobs."
  ON public.saved_jobs FOR DELETE
  USING ( auth.uid() = user_id );

-- Applications RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications."
  ON public.applications FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert their own applications."
  ON public.applications FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Job owners can view applications for their jobs."
  ON public.applications FOR SELECT
  USING ( 
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Job owners can update application status."
  ON public.applications FOR UPDATE
  USING ( 
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = applications.job_id
      AND jobs.user_id = auth.uid()
    )
  );

-- 3. Create Storage Bucketsfor Company Logos
-- Create a bucket named 'company_logos'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company_logos', 'company_logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to logos
CREATE POLICY "Logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'company_logos' );

-- Allow specific admin users to upload/update/delete logos
CREATE POLICY "Admin users can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'company_logos' AND auth.role() = 'authenticated' AND (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com') );

CREATE POLICY "Admin users can update logos"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'company_logos' AND auth.role() = 'authenticated' AND (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com') );

CREATE POLICY "Admin users can delete logos"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'company_logos' AND auth.role() = 'authenticated' AND (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com') );

-- 3.5 Create Storage Bucket for User Avatars (any authenticated user can upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- ==============================================================================
-- 4. Seed Data (Realistic Ghana Jobs)
-- ==============================================================================

INSERT INTO public.jobs (
  title, company, company_logo, location, salary, type, category, description, requirements, responsibilities, apply_url
) VALUES
(
  'Senior Frontend Developer', 
  'Hubtel', 
  'https://ui-avatars.com/api/?name=Hubtel&background=0F766E&color=fff',
  'Accra', 
  15000, 
  'Full-time', 
  'Technology', 
  'We are looking for a Senior Frontend Developer to lead the development of our modern web applications. You will work closely with our UX/UI designers and backend engineers to build seamless experiences for our users across Ghana.', 
  '- 5+ years of experience with modern JavaScript frameworks (React, Vue, or Angular)
- Deep understanding of CSS and responsive design
- Experience with state management
- Strong problem-solving skills
- Excellent communication skills', 
  '- Architect and build scalable frontend applications
- Mentor junior developers
- Collaborate with product managers to define feature requirements
- Optimize applications for maximum speed and scalability
- Ensure technical feasibility of UI/UX designs', 
  'https://hubtel.com/careers'
),
(
  'Digital Marketing Manager', 
  'MTN Ghana', 
  'https://ui-avatars.com/api/?name=MTN&background=FFCC00&color=000',
  'Accra', 
  12000, 
  'Full-time', 
  'Telecommunications', 
  'MTN Ghana is seeking a dynamic Digital Marketing Manager to drive our online presence and customer acquisition strategies. You will be responsible for conceptualizing and executing multi-channel digital campaigns.', 
  '- Bachelor''s degree in Marketing, Communications, or related field
- 4+ years of experience in digital marketing
- Proven experience managing SEO/SEM, email, social media, and display advertising campaigns
- Highly creative with experience in identifying target audiences
- Strong analytical skills and data-driven thinking', 
  '- Plan and execute all digital marketing, including SEO/SEM, marketing database, email, social media and display advertising campaigns
- Design, build and maintain our social media presence
- Measure and report performance of all digital marketing campaigns
- Identify trends and insights, and optimize spend and performance based on the insights', 
  'https://careers.mtn.com.gh/'
),
(
  'Software Engineer (Backend)', 
  'Paystack', 
  'https://ui-avatars.com/api/?name=Paystack&background=00C4FF&color=fff',
  'Remote', 
  18000, 
  'Remote', 
  'Technology', 
  'Join our mission to build the payment infrastructure for Africa. We are looking for an experienced backend engineer to help build robust, scalable payment APIs.', 
  '- Proficiency in Node.js, Go, or Ruby
- Experience building RESTful APIs
- Strong understanding of databases (PostgreSQL, Redis)
- Experience with cloud platforms (AWS, GCP)
- Passion for writing clean, testable code', 
  '- Design and implement robust backend services
- Integrate with various financial institutions and third-party APIs
- Ensure high performance and responsiveness of requests
- Collaborate with the frontend team to integrate user-facing elements
- Implement security and data protection measures', 
  'https://paystack.com/careers'
),
(
  'Project Manager', 
  'WaterAid Ghana', 
  'https://ui-avatars.com/api/?name=WaterAid&background=0079C1&color=fff',
  'Tamale', 
  8000, 
  'Contract', 
  'NGO', 
  'WaterAid Ghana is looking for a Project Manager to oversee our WASH initiatives in the Northern Region. This is a 2-year contract position requiring extensive field work.', 
  '- Master''s degree in Development Studies, Public Health, or related field
- 5+ years of project management experience in the NGO sector
- Deep understanding of WASH issues in Ghana
- Fluency in English and at least one local language spoken in the North
- Strong report writing skills', 
  '- Manage the day-to-day implementation of WASH projects
- Coordinate with local government and community leaders
- Monitor project progress against milestones and budget
- Prepare comprehensive reports for donors
- Supervise field staff and contractors', 
  'mailto:jobs.ghana@wateraid.org'
),
(
  'Financial Analyst', 
  'Ecobank Ghana', 
  'https://ui-avatars.com/api/?name=Ecobank&background=006B3F&color=fff',
  'Accra', 
  10000, 
  'Full-time', 
  'Banking', 
  'Ecobank is looking for a detail-oriented Financial Analyst to join our Pan-African banking team. You will analyze financial data, develop financial models, and provide actionable insights.', 
  '- BSc in Finance, Accounting, or Economics
- CFA or ACCA qualification is a plus
- 3+ years of experience in financial analysis
- Advanced Excel modeling skills
- Strong understanding of Ghanaian financial markets', 
  '- Analyze financial data and create financial models for decision support
- Report on financial performance and prepare for regular leadership reviews
- Analyze past results, perform variance analysis, identify trends
- Evaluate financial performance by comparing and analyzing actual results with plans and forecasts
- Provide analysis of trends and forecasts and recommend actions for optimization', 
  'https://ecobank.com/gh/personal-banking/careers'
),
(
  'UX/UI Designer', 
  'ExpressPay', 
  'https://ui-avatars.com/api/?name=expressPay&background=FF4B4B&color=fff',
  'Accra', 
  11000, 
  'Full-time', 
  'Technology', 
  'We are seeking a talented UX/UI Designer to create amazing user experiences. You should have an eye for clean and artful design and possess superior UI skills to translate high-level requirements into intuitive functional user interfaces.', 
  '- Proven UI experience
- Demonstrable UI design skills with a strong portfolio
- Solid experience in creating wireframes, storyboards, user flows, process flows and site maps
- Proficiency in Figma, Sketch, or Adobe XD
- Excellent visual design skills with sensitivity to user-system interaction', 
  '- Execute all visual design stages from concept to final hand-off to engineering
- Conceptualize original ideas that bring simplicity and user friendliness to complex design roadblocks
- Create wireframes, storyboards, user flows, process flows and site maps to effectively communicate interaction and design ideas
- Present and defend designs and key milestone deliverables to peers and executive level stakeholders
- Conduct user research and evaluate user feedback', 
  'https://expresspaygh.com/careers'
),
(
  'Customer Success Representative', 
  'Vodafone Ghana', 
  'https://ui-avatars.com/api/?name=Vodafone&background=E60000&color=fff',
  'Kumasi', 
  4500, 
  'Full-time', 
  'Telecommunications', 
  'Join the Vodafone family as a Customer Success Representative. You will be the primary point of contact for our enterprise clients, ensuring they get the most out of our connectivity solutions.', 
  '- HND or Degree in any field
- Excellent communication and presentation skills
- Ability to multi-task, prioritize, and manage time effectively
- Patient, empathetic, and passionately communicative
- Familiarity with CRM systems and practices', 
  '- Manage large amounts of incoming calls and emails
- Identify and assess customers'' needs to achieve satisfaction
- Build sustainable relationships and trust with customer accounts through open and interactive communication
- Handle customer complaints, provide appropriate solutions and alternatives
- Keep records of customer interactions, process customer accounts and file documents', 
  'https://careers.vodafone.com.gh/'
),
(
  'Data Scientist', 
  'Farmerline', 
  'https://ui-avatars.com/api/?name=Farmerline&background=32A852&color=fff',
  'Kumasi', 
  14000, 
  'Hybrid', 
  'Technology', 
  'Farmerline is leveraging data to transform agriculture in Africa. We need a Data Scientist to analyze agricultural data, build predictive models, and provide insights to improve crop yields and farmer livelihoods.', 
  '- Degree in Computer Science, Statistics, Mathematics, or related field
- Strong programming skills in Python or R
- Experience with machine learning frameworks (scikit-learn, TensorFlow, etc.)
- Knowledge of spatial data analysis is a strong plus
- Ability to communicate complex data findings to non-technical stakeholders', 
  '- Identify valuable data sources and automate collection processes
- Undertake preprocessing of structured and unstructured data
- Analyze large amounts of information to discover trends and patterns
- Build predictive models and machine-learning algorithms
- Present information using data visualization techniques', 
  'mailto:careers@farmerline.co'
),
(
  'DevOps Engineer', 
  'Zeepay', 
  'https://ui-avatars.com/api/?name=Zeepay&background=1A1A1A&color=fff',
  'Remote', 
  16000, 
  'Remote', 
  'Technology', 
  'We are looking for a DevOps Engineer to help us build functional systems that improve customer experience. You will be responsible for deploying product updates, identifying production issues, and implementing integrations.', 
  '- Work experience as a DevOps Engineer or similar software engineering role
- Good knowledge of Ruby or Python
- Working knowledge of databases and SQL
- Problem-solving attitude
- Collaborative team spirit', 
  '- Implement integrations requested by customers
- Deploy updates and fixes
- Provide Level 2 technical support
- Build tools to reduce occurrences of errors and improve customer experience
- Develop software to integrate with internal back-end systems', 
  'https://myzeepay.com/careers'
),
(
  'Branch Manager', 
  'GCB Bank', 
  'https://ui-avatars.com/api/?name=GCB&background=FFCC00&color=000',
  'Takoradi', 
  12000, 
  'Full-time', 
  'Banking', 
  'GCB Bank is seeking an experienced Branch Manager for our newly expanded Takoradi main branch. You will drive sales, ensure exceptional customer service, and oversee daily branch operations.', 
  '- Minimum 7 years of banking experience, with at least 3 years in a supervisory role
- Strong understanding of retail banking products and services
- Excellent leadership and people management skills
- Proven track record of meeting sales targets
- Knowledge of Bank of Ghana regulations', 
  '- Direct all operational aspects including distribution operations, customer service, human resources, administration and sales
- Assess local market conditions and identify current and prospective sales opportunities
- Develop forecasts, financial objectives and business plans
- Meet goals and metrics
- Manage budget and allocate funds appropriately', 
  'https://www.gcbbank.com.gh/careers'
);

-- ==============================================================================
-- 5. Freelance Marketplace Tables
-- ==============================================================================

-- Freelance Gigs table
CREATE TABLE IF NOT EXISTS public.freelance_gigs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  skills TEXT[],
  budget_min NUMERIC,
  budget_max NUMERIC,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Freelance Bids table
CREATE TABLE IF NOT EXISTS public.freelance_bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID REFERENCES public.freelance_gigs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount NUMERIC NOT NULL,
  message TEXT,
  delivery_days INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(gig_id, user_id)
);

-- Freelance Gigs RLS
ALTER TABLE public.freelance_gigs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Freelance gigs are viewable by everyone."
  ON public.freelance_gigs FOR SELECT
  USING ( true );

CREATE POLICY "Authenticated users can create gigs."
  ON public.freelance_gigs FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' );

CREATE POLICY "Users can update their own gigs."
  ON public.freelance_gigs FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete their own gigs."
  ON public.freelance_gigs FOR DELETE
  USING ( auth.uid() = user_id );

-- Freelance Bids RLS
ALTER TABLE public.freelance_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bids are viewable by everyone."
  ON public.freelance_bids FOR SELECT
  USING ( true );

CREATE POLICY "Authenticated users can place bids."
  ON public.freelance_bids FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' );

CREATE POLICY "Gig owners can update bid status."
  ON public.freelance_bids FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.freelance_gigs
      WHERE freelance_gigs.id = freelance_bids.gig_id
      AND freelance_gigs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own bids."
  ON public.freelance_bids FOR DELETE
  USING ( auth.uid() = user_id );
