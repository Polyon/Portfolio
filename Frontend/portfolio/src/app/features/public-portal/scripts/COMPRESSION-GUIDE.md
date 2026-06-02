# Image Compression Documentation (T103)

# Purpose: Convert and compress all portfolio images to WebP,
#          respecting the size budgets defined in the performance spec.

## Budget Targets
| Image Type          | Max Size | Max Width | srcset Variants     |
|---------------------|----------|-----------|---------------------|
| Hero / Profile      | < 300 KB | 1920 px   | 320w 768w 1280w 1920w |
| Project thumbnails  | < 100 KB | 1280 px   | 320w 768w 1280w      |
| Icons               | < 20 KB  | n/a       | SVG preferred        |

## Prerequisites
```sh
# macOS
brew install imagemagick webp

# Ubuntu / Debian
sudo apt-get install imagemagick webp

# Windows (via Chocolatey)
choco install imagemagick
choco install webp

# Windows (via WSL)
sudo apt-get install imagemagick webp
```

## Running the script
```sh
cd Frontend/portfolio
chmod +x src/app/features/public-portal/scripts/compress-images.sh

# Default: reads from public/assets/images, writes to public/assets/images/optimized
./src/app/features/public-portal/scripts/compress-images.sh

# Custom directories
./src/app/features/public-portal/scripts/compress-images.sh \
  ./public/assets/raw \
  ./public/assets/images
```

## Using optimised images in templates

### Hero / profile photo  (`<app-image-fallback>` supports srcset via @Input)
```html
<app-image-fallback
  [src]="profile.profileImageUrl"
  [webpSrc]="profile.profileImageUrl | toWebp"
  [srcset]="heroSrcset"
  sizes="(max-width: 768px) 100vw, 50vw"
  [alt]="profile.firstName + ' ' + profile.lastName"
  [size]="300" />
```

### Project thumbnail (`<app-responsive-image>`)
```html
<app-responsive-image
  [src]="project.thumbnailUrl"
  [webpSrc]="project.thumbnailUrl | toWebp"
  [srcset]="getProjectSrcset(project)"
  sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw"
  [alt]="project.title" />
```

## Quality settings reference
| Quality | Use case                    |
|---------|-----------------------------|
| 85      | High-fidelity hero images   |
| 78–82   | Project thumbnails          |
| 65–70   | Thumbnail fallback (mobile) |
