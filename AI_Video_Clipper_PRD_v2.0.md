# AI Video Clipper & Repurposing Studio — PRD v2.0

**Status:** Expanded product specification / implementation baseline  
**Date:** 28 November 2026  
**Primary result experience:** Clip Gallery  
**Product direction:** Dark Professional Creative Studio

## Executive summary
A web-based studio that turns long-form video into short-form content through AI highlight detection, transcript intelligence, speaker-aware reframing, captions, audio cleanup, B-roll, brand templates, editing, and social distribution workflows.

## Benchmark products
- OpusClip: multimodal highlight selection, virality-style scoring, auto-reframe and captions.
- Klap: prompt-based moment discovery, transcript-aware clipping, speaker reframing and multilingual workflows.
- Riverside: clips, hooks, longer segments, show notes, social posts, snapshots, audio cleanup and smart layouts.
- Vizard: smart reframing, translated captions, brand kit, editor and scheduling.
- Descript: transcript-based editing, filler/retake removal, AI co-editor and audio cleanup.
- Submagic: one-click auto-edit, captions, B-roll, transitions, zooms, music and chat-based edit refinement.

## Product principles
1. Clip Gallery is the primary result page.
2. Human-in-the-loop: AI changes are reviewable, editable, undoable.
3. Non-destructive editing.
4. Provider-agnostic architecture; Gemini is the initial semantic AI provider.
5. Background jobs for media processing.
6. Cost-aware processing and caching.
7. Scores are prioritization signals, not guarantees of virality.

## Feature catalogue

### Ingestion & project management
- Local upload, drag-and-drop, multi-file, progress, resumable upload, retry/cancel.
- MP4, MOV, WebM and FFmpeg-supported formats.
- Supported URL/cloud import with access validation and SSRF protection.
- Projects, folders, tags, notes, metadata, history, archive/delete.
- Proxy, thumbnails, waveform, audio extraction and media validation.

### AI understanding & discovery
- Multilingual timestamped transcription and speaker diarization.
- Scene/shot detection, face/person and active-speaker detection, OCR.
- Topic, story, sentiment, humor, emotion, key takeaway and quote understanding.
- Detect hooks, punchlines, tips, stories, debates, surprising facts and emotional moments.
- Natural-language prompt search and time-range/speaker/topic filters.
- Boundary refinement, standalone-context checks, filler/intro/outro/sponsor skip options.
- Duplicate detection and diversity selection.
- Automatic clip count/duration or custom constraints.
- Explainable ranking across hook, clarity, value, pacing, emotion, quality and redundancy.

### Clip Gallery
- Cards with thumbnail, preview, title, duration, source timecode, speaker, topic, score/reason and status.
- Sort/filter, bulk select/export/delete/template application.
- Regenerate, alternate moments, extend/shorten boundaries.
- Edit title, hook, caption, description, hashtags and thumbnail.
- Compare variants; favorite/approve/reject.
- Open clip in editor while preserving source linkage.
- Gallery remains the default AI result screen, not the timeline.

### Captions, transcript & translation
- Word/phrase timestamps, punctuation, speaker labels.
- Animated caption styles, karaoke/highlight, typography and placement controls.
- Custom vocabulary and manual transcript correction.
- Translation, SRT/VTT, burned-in subtitles, overflow/safe-area QA.

### Reframing & composition
- 9:16, 16:9, 1:1, 4:5 and custom dimensions.
- Face/active speaker/subject tracking, smart crop/pan/zoom.
- Multi-speaker, split-screen, picture-in-picture, screen-plus-camera layouts.
- Platform safe zones and manual override.

### AI polish / one-click auto edit
- Style templates, pacing, silence/filler/retake removal with review.
- Smart zoom, jump-cut smoothing, transitions.
- Contextual B-roll from licensed/user-provided/generated assets.
- Motion graphics, title cards, lower thirds, callouts.
- Music, ducking, fades, sound effects.
- Noise/echo reduction, voice enhancement, loudness normalization.
- Optional eye-contact correction only with consent and clear labeling.
- Every AI edit is reviewable and undoable.

### Brand kit & templates
- Logo, fonts, palette, watermark, intro/outro, CTA.
- Reusable caption/layout/export presets.
- Multiple brand profiles and content-specific templates.

### Video editor
- Non-destructive multitrack timeline.
- Trim, split, ripple delete, reorder, crop, transform, speed and volume.
- Transcript-based editing.
- Text, stickers, images, overlays, transitions, filters and audio tools.
- Undo/redo, autosave, snapshots, shortcuts, recovery and proxy preview.

### AI assistant
- Chat commands to find clips, change duration, focus speakers, remove pauses, style captions.
- Preview change plan, approve/reject, undo and change summary.
- Scoped permissions; no silent publishing or destructive action.

### Social packaging & publishing
- Titles, captions, descriptions, hashtags, CTA and thumbnail suggestions.
- Platform presets, content calendar, drafts, scheduling and multi-account publishing where official APIs permit.
- OAuth, token refresh, publish status/retry.
- Download/export remains available regardless of platform API limitations.

### Analytics & feedback
- Internal production, approval, editing, export and cost metrics.
- Connected platform analytics only where API access permits.
- Feedback from approved/rejected/edited clips can personalize recommendations.
- No promise of guaranteed virality.

### Collaboration & review
- Expiring/revocable review links, timestamp comments, approval states.
- Future team roles, permissions, versions and audit logs.

### Export studio
- Single/bulk export, 1080p and supported 4K, codec/bitrate/fps/audio/ratio controls.
- Render queue, progress, retry, completion notifications.
- Thumbnail, transcript, SRT/VTT and metadata export.
- Validate duration, dimensions, audio/video and file integrity.

### Admin, security & cost
- Gemini and alternate provider adapters.
- Server-side secrets, usage logs, quotas, concurrency, cancellation.
- Private object storage, signed URLs, encryption, SSRF protection.
- Data retention/deletion, audit, monitoring, backups and recovery.

## Delivery priorities
- **P0 MVP:** Auth, projects, upload/import, transcription, moment detection, rendering, Clip Gallery, preview, basic captions, export, jobs/logs.
- **P1 Competitive core:** prompt clipping, explainable score, speaker reframing, animated captions, transcript editor, brand kit, audio cleanup, silence/filler removal, bulk operations, platform presets.
- **P2 Advanced studio:** B-roll, motion graphics, chat editing, translation, social copy, thumbnails, variants, calendar, publishing, review links.
- **P3 Scale:** analytics, feedback learning, team collaboration, advanced repair and integrations.

## Technical architecture
Next.js/React/TypeScript; FastAPI; PostgreSQL; Redis/Celery; FFmpeg/FFprobe; OpenCV/MediaPipe; Gemini semantic adapter; independent speech-to-text adapter; S3-compatible private object storage; WebSocket/SSE progress; structured logs and cost tracking.

## Roadmap
1. Foundation: repository, Docker, database, auth, projects.
2. Media infrastructure: upload, storage, metadata, proxies, jobs.
3. AI intelligence: transcription, diarization, scene analysis, candidate scoring.
4. Clip production & Gallery: rendering, captions, reframing, thumbnails, preview/export.
5. Editor & brand: timeline, transcript edit, templates, brand kit, audio polish.
6. Publishing & intelligence: platform presets, calendar, integrations, analytics, collaboration.

## Guardrails
No guaranteed virality; no unauthorized scraping/download; direct publishing depends on official platform APIs; synthetic voice/likeness features require consent and legal review; no silent destructive edits or publishing; advanced features must not block the core upload-to-gallery pipeline.

## Acceptance criteria
A valid source video can be uploaded asynchronously; transcript timestamps are usable; AI returns ranked candidates with reasons and timecodes; rendered clips play correctly; Clip Gallery supports preview/filter/sort/edit/export; edits preserve source linkage; captions can be corrected; jobs retry safely; access is private; usage and cost are logged.

## Sources
- https://www.opus.pro/
- https://klap.app/how-it-works
- https://support.riverside.com/hc/en-us/articles/13315511579037-AI-Tools-Overview
- https://support.riverside.com/hc/en-us/articles/12124048765981-About-Magic-Clips
- https://vizard.ai/id/tools/video-repurposing-tool
- https://www.descript.com/features
- https://care.submagic.co/en/article/how-to-use-ai-auto-edit-in-submagic-gaxw7t/
- https://care.submagic.co/en/article/what-is-iris-in-submagic-and-how-does-it-edit-your-videos-4sf4zn/
