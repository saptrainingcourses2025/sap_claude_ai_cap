---
description: Export SAP CAP schema.cds and common.cds as a visual database design image with branding
argument-hint: [optional: output filename without extension]
---

# Export CAP Database Design as Branded Image

Generate a high-quality, professional database design diagram from the 
project's CAP schema files (schema.cds and common.cds) and export it 
as a PNG image with custom branding.

User specified filename: $ARGUMENTS
(If empty, use default name: cap-database-design)

═══════════════════════════════════════════════════════════════════
STEP 1: LOCATE AND READ SCHEMA FILES
═══════════════════════════════════════════════════════════════════

1. Find and read the following files:
   - db/schema.cds (main entities)
   - db/common.cds (reusable types and code lists)
2. If common.cds doesn't exist, work only with schema.cds
3. Parse the CDS files to extract:
   - All entities with their fields and data types
   - All associations and compositions between entities
   - All code list entities
   - All annotations (especially @title)
   - Cardinality of relationships (1:1, 1:N, N:M)
   - Primary keys and mandatory fields

═══════════════════════════════════════════════════════════════════
STEP 2: GENERATE THE DATABASE DESIGN HTML
═══════════════════════════════════════════════════════════════════

Create a self-contained HTML file at: 
/home/claude/db-design.html

The HTML must contain a comprehensive ER diagram using Mermaid.js 
with the following specifications:

VISUAL DESIGN REQUIREMENTS:

1. **Page Setup:**
   - Landscape orientation, large canvas (1920x1280 minimum)
   - White background with subtle gradient
   - Embed Mermaid.js from CDN

2. **Header Section (top of image):**
   - Large bold title: "VACATION & TRAVELLER MANAGEMENT"
   - Subtitle: "SAP CAP Database Design"
   - Font size for main title: 48px
   - Font size for subtitle: 28px
   - Use professional typography (Segoe UI, Arial, or similar)
   - Add a horizontal divider line below the header

3. **Branding Watermark (TOP-RIGHT corner):**
   - Text: "🎬 Anubhav Trainings"
   - Subtitle: "Claude Tutorials"
   - Font size: 32px bold for main, 22px for subtitle
   - Color: Dark blue (#1e3a8a) with subtle shadow
   - Position: Fixed top-right with 40px margin
   - Add a colored badge background

4. **Branding Footer (BOTTOM of image):**
   - Large bookmark-style banner spanning full width
   - Text: "ANUBHAV TRAININGS — CLAUDE TUTORIALS"
   - Subtitle: "SAP CAP Database Design Tutorial Series"
   - Background: Gradient from #1e3a8a to #3b82f6
   - Text color: White
   - Font size: 36px bold for main text, 22px for subtitle
   - Height: 120px
   - Add subtle pattern or icons (📚 🎓 ▶️)

5. **ER Diagram Specifications:**
   - Use Mermaid erDiagram syntax
   - Show ALL entities with their fields
   - Show data types next to each field
   - Mark primary keys with PK
   - Mark foreign keys with FK
   - Mark mandatory fields clearly
   - Show all relationships with proper cardinality
   - Color-code different entity types:
     * Code Lists (AddressTypes, TravellerStatus, Roles): Light blue
     * Main Entities (Travellers, Vacations): Light green
     * Supporting Entities (Contacts, Destinations): Light yellow
     * User Management (AppUsers): Light purple
   - Font size in diagram: minimum 18px (large and readable)
   - Entity title font: 22px bold

6. **Legend Section (right side or bottom-left):**
   - Color legend explaining entity categories
   - Symbol legend (PK, FK, mandatory)
   - Relationship type legend (composition vs association)

7. **Statistics Box (top-left or bottom-left corner):**
   Display key metrics in an attractive box:
   - Total Entities: <count>
   - Code Lists: <count>
   - Total Fields: <count>
   - Total Relationships: <count>
   - Generated: <current date>

═══════════════════════════════════════════════════════════════════
STEP 3: SAMPLE MERMAID STRUCTURE
═══════════════════════════════════════════════════════════════════

Use this Mermaid erDiagram template structure (adapt based on actual 
parsed entities):

erDiagram
    TRAVELLERS ||--o{ CONTACTS : "has"
    TRAVELLERS ||--o{ DESTINATIONS : "has"
    TRAVELLERS ||--o{ VACATIONS : "books"
    TRAVELLERS }o--|| TRAVELLER_STATUS : "has status"
    CONTACTS }o--|| ADDRESS_TYPES : "is of type"
    APP_USERS }o--|| ROLES : "has role"
    APP_USERS }o--o| TRAVELLERS : "linked to"
    
    TRAVELLERS {
        UUID ID PK
        String userName "mandatory"
        String firstName
        String lastName
        String gender
        Integer age
        String status
        DateTime createdAt
    }

═══════════════════════════════════════════════════════════════════
STEP 4: CONVERT HTML TO PNG IMAGE
═══════════════════════════════════════════════════════════════════

After creating the HTML file:

1. Install puppeteer if not already available:
   npm install --prefix /home/claude puppeteer --no-save

2. Create a screenshot script at /home/claude/screenshot.js:

```javascript
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  await page.setViewport({
    width: 1920,
    height: 1280,
    deviceScaleFactor: 2  // Retina quality
  });
  
  await page.goto('file:///home/claude/db-design.html', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  // Wait for Mermaid to render
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Get full page height
  const bodyHeight = await page.evaluate(() => 
    document.body.scrollHeight
  );
  
  await page.setViewport({
    width: 1920,
    height: bodyHeight,
    deviceScaleFactor: 2
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await page.screenshot({
    path: '/mnt/user-data/outputs/' + 
          (process.argv[2] || 'cap-database-design') + '.png',
    fullPage: true,
    type: 'png'
  });
  
  await browser.close();
  console.log('Screenshot saved successfully!');
})();
```

3. Run the screenshot script:
   node /home/claude/screenshot.js <filename>

═══════════════════════════════════════════════════════════════════
STEP 5: PRESENT THE FINAL IMAGE
═══════════════════════════════════════════════════════════════════

1. Verify the PNG file was created in /mnt/user-data/outputs/
2. Use the present_files tool to share the image
3. Provide a summary including:
   - Image filename and resolution
   - Number of entities visualized
   - Number of relationships shown
   - File size
   - Suggested usage:
     * YouTube thumbnail
     * Tutorial documentation
     * SAP project README
     * Architecture review presentation

═══════════════════════════════════════════════════════════════════
STYLING DETAILS FOR HTML
═══════════════════════════════════════════════════════════════════

Use this CSS theme in the HTML (modern, professional, branded):

- Primary color: #1e3a8a (Deep blue)
- Secondary color: #3b82f6 (Bright blue)
- Accent color: #f59e0b (Gold/Yellow for highlights)
- Background: Linear gradient #f8fafc to #e2e8f0
- Entity boxes: White with 2px solid borders
- Drop shadows: 0 4px 12px rgba(0,0,0,0.1)
- Border radius: 12px for boxes, 8px for legend items
- Font family: 'Segoe UI', 'Arial', sans-serif

For the ANUBHAV TRAININGS branding:
- Use a distinctive badge style
- Include emoji icons (🎬 📚 🎓 ▶️)
- Add a subtle "TUTORIAL" ribbon style
- Make it feel like a YouTube channel branding

═══════════════════════════════════════════════════════════════════
ERROR HANDLING
═══════════════════════════════════════════════════════════════════

If any step fails:
1. If schema.cds is missing → tell user and stop
2. If puppeteer install fails → try alternative: 
   use Playwright or html2canvas
3. If Mermaid rendering fails → fall back to a custom HTML/CSS 
   ER diagram with manually styled boxes and connector lines
4. Always provide the HTML file as fallback even if PNG generation 
   fails, so user can open it in browser and screenshot manually

═══════════════════════════════════════════════════════════════════
FINAL DELIVERABLES
═══════════════════════════════════════════════════════════════════

After completion, present:
1. The final PNG image (high resolution, branded)
2. The source HTML file (for future edits)
3. A brief summary of what was visualized

The image should look professional enough to:
- Use as a YouTube video thumbnail
- Include in technical documentation
- Show in a presentation
- Share on LinkedIn/Twitter for tutorial promotion