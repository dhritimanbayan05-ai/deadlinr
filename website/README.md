# Deadlinr - Static Website

A simple, zero-dependency to-do list with gamification for **Prayash (Coder OP)**, **Piyush (Singer OP)**, and **Dhritiman (Writer OP)**.

## Files

- **index.html** - Main dashboard with user columns, momentum, and roast feed
- **tribunal.html** - Evidence verification page (The Tribunal)
- **styles.css** - Complete dark mode styling with Bento Grid layout
- **dashboard.js** - Dashboard logic (task toggling, momentum calculation)
- **logic.js** - Gamification & scheduler logic

## How to Use

1. **Open `index.html` in your browser** (double-click or right-click → Open With → Browser)
2. Click tasks to toggle completion - **Momentum updates live!**
3. Click "Tribunal" to view the verification page
4. Click "Back to Dashboard" to return

## Features Working

✅ Interactive task toggling  
✅ Live momentum calculation  
✅ Streak tracking (mocked for now)  
✅ Roast feed generation  
✅ Dark/Bold aesthetic  

## Not Yet Implemented (Needs Backend)

❌ Real-time sync between users  
❌ Task persistence (refreshing resets)  
❌ Actual evidence uploads  
❌ Voting mechanism  
❌ Edit credits system  

**To add a backend:** Connect to Supabase by adding their JS SDK in a `<script>` tag and modifying `dashboard.js` to save/load tasks from the database.
