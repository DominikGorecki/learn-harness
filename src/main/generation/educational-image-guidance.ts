/** App-owned prompting resource, adapted from general image prompting principles.
 * Kept in the worker bundle; no external skill location or execution tool is required.
 */
export const educationalImageSkillVersion = 'educational-images-v1'
export const educationalImageGuidance = `Educational illustration guidance v1:
Plan at least one useful visual even when the learner selected text-only delivery. Every visual must explain a specific idea for this topic's audience; decorative filler is insufficient. If several visuals are useful, give them distinct explanatory purposes.
Write each prompt in this order: intended educational use and audience; scene/background; subject and important relationships; composition/viewpoint; factual constraints; visual consistency; output intent. Use concrete details that improve understanding without inventing unrelated objects or claims. State scientific, mathematical, temporal and spatial constraints explicitly. Keep a consistent visual language across the chapter.
Prefer clear relationships and simple composition. Essential labels and meaning must also appear as native accessible chapter text, caption or alt text; do not make learning depend on raster lettering. If labels are pictured, quote their exact wording and require readable, accurate text. Supply a concise descriptive caption and meaningful alt text for each image.
Use skillVersion educational-images-v1. Image settings are assigned by the application; copy the supplied settings exactly. generate_topic_image accepts only a validated imageId; never supply endpoints, credentials, model selection, prompt changes, size or quality options to that tool.`
