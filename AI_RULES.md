Key Requirements:
- Do not edit the .env files, like .env.local

- **`package.json` Integrity**: When editing `package.json`, you must **never** remove existing top-level keys like `scripts`, `dependencies`, or `devDependencies`. Only modify the specific entries within these keys as required by the user's request.

- TypeScript: All React code must use TypeScript.

- React Router: Use React Router for navigation. All routes are defined in src/App.tsx.

- Source Code Location: All source code lives in the src directory.

- Pages: Place all page components in src/pages/.

- Components: All reusable components go in src/components/.

- If you need to modify a component from shadcn/ui, do not edit library files—create a new component.

- Main Page: The default landing page is src/pages/Index.tsx.

- Update the main page to include new components so users can see them.

- UI Libraries:

- Use shadcn/ui components wherever possible. Import, don’t modify.

- Tailwind CSS is the default styling method. Use Tailwind utility classes for all layout, spacing, colors, and visuals.

- Lucide-react is available for icons.

- All required Radix UI and shadcn/ui dependencies are installed—don’t add or reinstall.

- Animations: Use Framer Motion where interactive animations are needed.

- Color Scheme:
- Background: #12001a
- Accent: #a259ff
- Text: #fff
- Contrast: #3d235a

- All colors are defined as tokens in Tailwind config. Use them via Tailwind classes.

- Backend: Next.js API routes (in pages/api/) serve as the backend.

- Data is stored in Google Cloud Datastore.

- App is deployed via Google Cloud Run.

- Authentication:

- NextAuth is used for auth (Email+Password, Gmail, Microsoft).

- Email verification is required.

- Full address required on signup (for region validation, not shown on frontend).

- Community Features:

- Voting is anonymous per topic/solution, but display names are visible in post-vote discussions.

- Discussions are gated by vote status.

- Community badges and admin moderation are present.

- Admin Features:

- Admin panel components in src/components/AdminPanel/.

- NO Supabase: This project does not use Supabase for any backend, database, or auth services.

- Never import and use a => always use from.  import { DUMMY_TOPICS } => should be... import { DUMMY_TOPICS } from

- **Third-Party Prop Accuracy**:
  - **Trust the Build Process**: Build errors about unknown or invalid props are definitive. I must correct the prop name as suggested (e.g., `borderColor` instead of `cellBorderColor`) and remove props that do not exist (e.g., `cellOpacity`).
  - **Nivo Chart Props**: Be particularly cautious with props for Nivo charts (`@nivo/*`). My training data may contain outdated or incorrect examples. Stick to the most common and essential props unless a specific, less-common prop is requested.
  - **Avoid Prop Hallucination**: Do not invent props that seem plausible. If unsure about a prop's existence or name, it's safer to omit it and achieve the styling through the `theme` object or other valid means if possible.

  API Route Path Verification: Before writing an import path in any file under src/pages/api/, I will mentally trace the path from the current file to the target, counting each directory level to ensure the relative path (../) is correct.
Third-Party Type Declarations: When importing a JavaScript library that might not have built-in types, I will anticipate the need for a declaration file. If a type error occurs, I will immediately create a src/types/[library-name].d.ts file to resolve it.
Explicit Typing in Callbacks: In all array methods like .forEach(), .map(), and .filter(), I will explicitly add types to all callback parameters to prevent implicit any errors.