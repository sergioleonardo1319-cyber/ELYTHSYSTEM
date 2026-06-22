from pathlib import Path

from PIL import Image, ImageFilter


BASE = Path(r"C:\Users\User\Desktop\cafeteria-system\frontend\src\assets")

ITEMS = [
    ("elyth-seguro.png", "elyth-seguro-clean.png", (0.30, 0.16, 0.70, 0.84)),
    ("elyth-confiable.png", "elyth-confiable-clean.png", (0.12, 0.10, 0.88, 0.88)),
    ("elyth-moderno.png", "elyth-moderno-clean.png", (0.31, 0.18, 0.69, 0.76)),
]


def prepare_icon(src_name, out_name, crop_rel):
    img = Image.open(BASE / src_name).convert("RGBA")
    width, height = img.size
    crop_box = tuple(
        int(value * (width if index % 2 == 0 else height))
        for index, value in enumerate(crop_rel)
    )
    crop = img.crop(crop_box).convert("RGBA")
    pixels = crop.load()
    crop_width, crop_height = crop.size
    alpha = Image.new("L", (crop_width, crop_height), 0)
    alpha_pixels = alpha.load()

    for y in range(crop_height):
        for x in range(crop_width):
            red, green, blue, original_alpha = pixels[x, y]
            max_value = max(red, green, blue)
            min_value = min(red, green, blue)
            saturation = max_value - min_value
            gold = red > 125 and green > 85 and blue < 160 and saturation > 25
            warm_light = red > 190 and green > 160 and blue < 205 and saturation > 18
            highlight = red > 225 and green > 210 and blue > 160 and saturation > 10

            if original_alpha > 0 and (gold or warm_light or highlight):
                alpha_pixels[x, y] = 255

    alpha = alpha.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(0.9))
    crop.putalpha(alpha)

    bounds = alpha.point(lambda pixel: 255 if pixel > 18 else 0).getbbox()
    if bounds:
        crop = crop.crop(bounds)

    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    crop.thumbnail((430, 430), Image.LANCZOS)
    x = (512 - crop.width) // 2
    y = (512 - crop.height) // 2
    canvas.alpha_composite(crop, (x, y))
    canvas.save(BASE / out_name)
    print(f"{out_name} created")


for item in ITEMS:
    prepare_icon(*item)
