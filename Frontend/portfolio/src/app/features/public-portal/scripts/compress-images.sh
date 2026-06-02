#!/usr/bin/env bash
# =============================================================================
# Image Compression Script (T103)
# Compresses all portfolio images to WebP format with size targets:
#   - Hero / profile images  → <300KB
#   - Project thumbnails     → <100KB
#   - Icons                  → SVG preferred, otherwise <20KB WebP
#
# Requirements: ImageMagick (convert) and cwebp (libwebp-tools) installed.
#   macOS : brew install imagemagick webp
#   Ubuntu: sudo apt-get install imagemagick webp
#   Windows: choco install imagemagick; choco install webp (or WSL)
#
# Usage:
#   chmod +x compress-images.sh
#   ./compress-images.sh [INPUT_DIR] [OUTPUT_DIR]
#
# Defaults:
#   INPUT_DIR  = public/assets/images
#   OUTPUT_DIR = public/assets/images/optimized
# =============================================================================

set -euo pipefail

INPUT_DIR="${1:-public/assets/images}"
OUTPUT_DIR="${2:-public/assets/images/optimized}"

# ── Validate dependencies ─────────────────────────────────────────────────────
if ! command -v convert &>/dev/null; then
  echo "[ERROR] ImageMagick (convert) not found. Install it first." >&2
  exit 1
fi

if ! command -v cwebp &>/dev/null; then
  echo "[WARN]  cwebp not found; falling back to ImageMagick WebP encoder."
  USE_CWEBP=false
else
  USE_CWEBP=true
fi

mkdir -p "$OUTPUT_DIR"

# ── Helper: convert + resize a single image ──────────────────────────────────
compress_image() {
  local src="$1"
  local dest="$2"
  local quality="${3:-82}"
  local max_width="${4:-0}"  # 0 = keep original width

  if [ "$USE_CWEBP" = true ]; then
    if [ "$max_width" -gt 0 ]; then
      # Resize first with ImageMagick, then encode with cwebp
      local tmp
      tmp=$(mktemp /tmp/compress_XXXXXX.png)
      convert "$src" -resize "${max_width}>" "$tmp"
      cwebp -q "$quality" "$tmp" -o "$dest" -quiet
      rm -f "$tmp"
    else
      cwebp -q "$quality" "$src" -o "$dest" -quiet
    fi
  else
    local resize_flag=""
    if [ "$max_width" -gt 0 ]; then
      resize_flag="-resize ${max_width}>"
    fi
    # shellcheck disable=SC2086
    convert "$src" $resize_flag -quality "$quality" -define webp:lossless=false "$dest"
  fi
}

# ── Generate srcset variants ─────────────────────────────────────────────────
generate_srcset() {
  local src="$1"
  local base_name
  base_name=$(basename "$src" | sed 's/\.[^.]*$//')
  local dir="$OUTPUT_DIR"

  for width in 320 768 1280 1920; do
    local dest="${dir}/${base_name}-${width}w.webp"
    compress_image "$src" "$dest" 82 "$width"
    echo "  → ${dest} (${width}w)"
  done
}

# ── Process images by category ───────────────────────────────────────────────
echo ""
echo "=== Compressing Hero / Profile images (target <300KB) ==="
for img in "$INPUT_DIR"/hero*.{jpg,jpeg,png,JPG,PNG} \
            "$INPUT_DIR"/profile*.{jpg,jpeg,png,JPG,PNG} 2>/dev/null; do
  [ -f "$img" ] || continue
  dest="$OUTPUT_DIR/$(basename "$img" | sed 's/\.[^.]*$//').webp"
  echo "Processing: $img"
  compress_image "$img" "$dest" 82 1920
  # Generate srcset variants for hero
  generate_srcset "$img"
  size=$(du -k "$dest" | cut -f1)
  echo "  → ${dest} (${size}KB)"
  if [ "$size" -gt 300 ]; then
    echo "  [WARN] File exceeds 300KB target. Try lower quality: compress_image \"$img\" \"$dest\" 70 1920"
  fi
done

echo ""
echo "=== Compressing Project thumbnails (target <100KB, max 1280px) ==="
for img in "$INPUT_DIR"/project*.{jpg,jpeg,png,JPG,PNG} \
            "$INPUT_DIR"/thumb*.{jpg,jpeg,png,JPG,PNG} 2>/dev/null; do
  [ -f "$img" ] || continue
  dest="$OUTPUT_DIR/$(basename "$img" | sed 's/\.[^.]*$//').webp"
  echo "Processing: $img"
  compress_image "$img" "$dest" 78 1280
  # Generate srcset for projects: 320w, 768w, 1280w
  local base_name
  base_name=$(basename "$img" | sed 's/\.[^.]*$//')
  for width in 320 768 1280; do
    compress_image "$img" "${OUTPUT_DIR}/${base_name}-${width}w.webp" 78 "$width"
    echo "  → ${OUTPUT_DIR}/${base_name}-${width}w.webp (${width}w)"
  done
  size=$(du -k "$dest" | cut -f1)
  echo "  → ${dest} (${size}KB)"
  if [ "$size" -gt 100 ]; then
    echo "  [WARN] File exceeds 100KB target. Try lower quality: compress_image \"$img\" \"$dest\" 65 1280"
  fi
done

echo ""
echo "=== Done ==="
echo "Optimized images written to: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "  1. Review output sizes in $OUTPUT_DIR"
echo "  2. Update component templates to use <picture> + srcset"
echo "  3. Reference WebP assets from CDN or serve from $OUTPUT_DIR"
