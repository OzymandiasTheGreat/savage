# Savage

![savage](./screenshots/screenshot.png)

Welcome to Savage, a different kind of vector graphics editor.
You can try it out at [savageapp.ml](https://savageapp.ml/).

I developed this app over a couple of months while having excess free time due to being between jobs and dealing with Covid-19.

I figured this would be a good showcase of my front-end skills.
Another reason why I made this is that ever since I first started coding I've considered graphics editors the epitome of software development, it's what cool developers do :)

Yet another reason is that I kind of hate Inkscape. It's what I've been using for years, but the interface is ugly, clunky, and confusing. The SVGs it produces are a mess. Some edits are much easier to do by opening the SVG in a text editor, yet Inkscape SVGs a pretty difficult to edit manually. Hence with Savage, I aimed to produce SVGs that would be downright pleasant to edit manually. While Savage includes interface for most SVG 2.0 standard features, it also includes a raw XML editing interface that shares undo/redo history with the rest of the app.

Savage forgoes the common graphics editor feature set to focus on vector editing. That means no calligraphic brush, for it's just a complex path and thus a low priority feature. Another thing Savage doesn't feature is layers. Instead you have elements panel where elements, groups and everything else are represented in document hierarchy.

Now I poured a lot of time into Savage development and bugfixing, however it's still fairly buggy and I'm still working on it.
Part of the reason for this is that I'm fairly horrible at math.
If you see wrong calculations and know how to do it right, pull requests are very welcome.

## Features and Overview

- Vector editing. Savage only supports SVG format, but every vector editor can export to this format.
- Autosave and recent documents. When you open and edit a document in Savage, every change is saved to IndexedDB, so even if you run into a critical bug, you can just reload the page and continue where you left off from the recent menu.
- Multiple export formats. Savage provides downloads for Savage SVG which is an SVG with extra metadata, Optimized SVG - an SVG with everything not strictly necessary removed, roughly half in size, and PNG.

### The Toolbar

Savage toolbar is located along the left edge of the screen. Here you can select from available tools and right click to access tool options. Note, that not every tool has options.

- Object select/transform tool. The default tool that is selected when you open a document. Clicking an element selects it, dragging moves it, dragging empty space creates selection rectangle. Clicking element again toggles between scale/rotate/skew modes. Shift clicking selects multiple elements, control clicking removes elements from selection, alt clicking selects container element if any. To move multiple elements hold shift while dragging. This tool has options. When apply matrix is on (default) transforming element tries to apply transformation to coordinates rather than applying transform attribute.
- Path tool. The most complex and powerful tool available. You can only select `<path>` elements with it. Double clicking when no element is selected creates a new path and selects it. Double clicking when a path is selected appends a segment to path. Shift double clicking inserts a segment between nearest segments. The rectangular handles move segments, the round handles adjust curves. Clicking and dragging creates selection rectangle for segment handles.
- Line tool. You can only select `<line>` and `<polyline>` elements with it. Double clicking starts creation of a new line. Double clicking again sets end point in line mode and next segment in polyline mode. You can toggle between modes in tool options.
