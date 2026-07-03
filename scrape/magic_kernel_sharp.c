#include <math.h>
#include <stdint.h>
#include <stdlib.h>

static double magic_kernel(double value) {
    double x = fabs(value);
    if (x <= 0.5) {
        return 0.75 - x * x;
    }
    if (x <= 1.5) {
        double d = x - 1.5;
        return 0.5 * d * d;
    }
    return 0.0;
}

static uint8_t clamp_byte(double value) {
    long rounded = lrint(value);
    if (rounded < 0) {
        return 0;
    }
    if (rounded > 255) {
        return 255;
    }
    return (uint8_t)rounded;
}

int mks_resample_axis_rgba(
    const uint8_t *src,
    int source_width,
    int source_height,
    int target_size,
    int axis,
    uint8_t *dst
) {
    if (!src || !dst || source_width <= 0 || source_height <= 0 || target_size <= 0) {
        return 1;
    }

    int target_width = axis == 0 ? target_size : source_width;
    int target_height = axis == 1 ? target_size : source_height;
    int src_extent = axis == 0 ? source_width : source_height;
    int dst_extent = target_size;
    double scale = (double)dst_extent / (double)src_extent;
    double distance_scale = scale < 1.0 ? scale : 1.0;
    double radius = 1.5 / distance_scale;

    for (int out_y = 0; out_y < target_height; out_y++) {
        for (int out_x = 0; out_x < target_width; out_x++) {
            int out_pos = axis == 0 ? out_x : out_y;
            double center = ((double)out_pos + 0.5) / scale - 0.5;
            int start = (int)(center - radius) - 1;
            int end = (int)(center + radius) + 1;
            if (start < 0) {
                start = 0;
            }
            if (end > src_extent - 1) {
                end = src_extent - 1;
            }

            double total_weight = 0.0;
            double channels[4] = {0.0, 0.0, 0.0, 0.0};
            for (int sample_pos = start; sample_pos <= end; sample_pos++) {
                double distance = ((double)sample_pos - center) * distance_scale;
                double weight = magic_kernel(distance);
                if (weight == 0.0) {
                    continue;
                }
                int px = axis == 0 ? sample_pos : out_x;
                int py = axis == 0 ? out_y : sample_pos;
                const uint8_t *pixel = src + ((py * source_width + px) * 4);
                total_weight += weight;
                channels[0] += (double)pixel[0] * weight;
                channels[1] += (double)pixel[1] * weight;
                channels[2] += (double)pixel[2] * weight;
                channels[3] += (double)pixel[3] * weight;
            }

            uint8_t *out_pixel = dst + ((out_y * target_width + out_x) * 4);
            if (total_weight != 0.0) {
                out_pixel[0] = clamp_byte(channels[0] / total_weight);
                out_pixel[1] = clamp_byte(channels[1] / total_weight);
                out_pixel[2] = clamp_byte(channels[2] / total_weight);
                out_pixel[3] = clamp_byte(channels[3] / total_weight);
            } else {
                out_pixel[0] = 0;
                out_pixel[1] = 0;
                out_pixel[2] = 0;
                out_pixel[3] = 0;
            }
        }
    }
    return 0;
}

int mks_sharp_axis_rgba(
    const uint8_t *src,
    int width,
    int height,
    int axis,
    uint8_t *dst
) {
    if (!src || !dst || width <= 0 || height <= 0) {
        return 1;
    }

    const double kernel[7] = {-1.0, 6.0, -35.0, 204.0, -35.0, 6.0, -1.0};
    const double divisor = 144.0;
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            double channels[4] = {0.0, 0.0, 0.0, 0.0};
            for (int k = 0; k < 7; k++) {
                int offset = k - 3;
                int px = x;
                int py = y;
                if (axis == 0) {
                    px = x + offset;
                    if (px < 0) {
                        px = 0;
                    } else if (px >= width) {
                        px = width - 1;
                    }
                } else {
                    py = y + offset;
                    if (py < 0) {
                        py = 0;
                    } else if (py >= height) {
                        py = height - 1;
                    }
                }
                const uint8_t *pixel = src + ((py * width + px) * 4);
                double weight = kernel[k];
                channels[0] += (double)pixel[0] * weight;
                channels[1] += (double)pixel[1] * weight;
                channels[2] += (double)pixel[2] * weight;
                channels[3] += (double)pixel[3] * weight;
            }
            uint8_t *out_pixel = dst + ((y * width + x) * 4);
            out_pixel[0] = clamp_byte(channels[0] / divisor);
            out_pixel[1] = clamp_byte(channels[1] / divisor);
            out_pixel[2] = clamp_byte(channels[2] / divisor);
            out_pixel[3] = clamp_byte(channels[3] / divisor);
        }
    }
    return 0;
}

int mks_shift_rgba(
    const uint8_t *src,
    int width,
    int height,
    double shift_x,
    double shift_y,
    uint8_t *dst
) {
    if (!src || !dst || width <= 0 || height <= 0) {
        return 1;
    }

    int out_width = width + 2;
    int out_height = height + 2;
    double *temp = (double *)calloc((size_t)height * (size_t)out_width * 4, sizeof(double));
    if (!temp) {
        return 2;
    }

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < out_width; x++) {
            double src_x = (double)x - shift_x;
            int start = (int)floor(src_x - 1.5);
            int end = (int)ceil(src_x + 1.5);
            double total_weight = 0.0;
            double channels[4] = {0.0, 0.0, 0.0, 0.0};
            for (int sx = start; sx <= end; sx++) {
                if (sx < 0 || sx >= width) {
                    continue;
                }
                double weight = magic_kernel(src_x - (double)sx);
                if (weight == 0.0) {
                    continue;
                }
                const uint8_t *pixel = src + ((y * width + sx) * 4);
                double alpha = (double)pixel[3] / 255.0;
                channels[0] += (double)pixel[0] * alpha * weight;
                channels[1] += (double)pixel[1] * alpha * weight;
                channels[2] += (double)pixel[2] * alpha * weight;
                channels[3] += (double)pixel[3] * weight;
                total_weight += weight;
            }
            if (total_weight != 0.0) {
                double *out_pixel = temp + ((y * out_width + x) * 4);
                out_pixel[0] = channels[0] / total_weight;
                out_pixel[1] = channels[1] / total_weight;
                out_pixel[2] = channels[2] / total_weight;
                out_pixel[3] = channels[3] / total_weight;
            }
        }
    }

    for (int y = 0; y < out_height; y++) {
        double src_y = (double)y - shift_y;
        int start = (int)floor(src_y - 1.5);
        int end = (int)ceil(src_y + 1.5);
        for (int x = 0; x < out_width; x++) {
            double total_weight = 0.0;
            double channels[4] = {0.0, 0.0, 0.0, 0.0};
            for (int sy = start; sy <= end; sy++) {
                if (sy < 0 || sy >= height) {
                    continue;
                }
                double weight = magic_kernel(src_y - (double)sy);
                if (weight == 0.0) {
                    continue;
                }
                double *pixel = temp + ((sy * out_width + x) * 4);
                channels[0] += pixel[0] * weight;
                channels[1] += pixel[1] * weight;
                channels[2] += pixel[2] * weight;
                channels[3] += pixel[3] * weight;
                total_weight += weight;
            }
            uint8_t *out_pixel = dst + ((y * out_width + x) * 4);
            if (total_weight == 0.0) {
                out_pixel[0] = 0;
                out_pixel[1] = 0;
                out_pixel[2] = 0;
                out_pixel[3] = 0;
                continue;
            }
            double alpha = channels[3] / total_weight;
            if (alpha <= 0.0) {
                out_pixel[0] = 0;
                out_pixel[1] = 0;
                out_pixel[2] = 0;
                out_pixel[3] = 0;
                continue;
            }
            if (alpha > 255.0) {
                alpha = 255.0;
            }
            double unpremultiply = 255.0 / alpha;
            out_pixel[0] = clamp_byte((channels[0] / total_weight) * unpremultiply);
            out_pixel[1] = clamp_byte((channels[1] / total_weight) * unpremultiply);
            out_pixel[2] = clamp_byte((channels[2] / total_weight) * unpremultiply);
            out_pixel[3] = clamp_byte(alpha);
        }
    }

    free(temp);
    return 0;
}

int mks_resample_translate_rgba(
    const uint8_t *src,
    int source_width,
    int source_height,
    int target_width,
    int target_height,
    double scale_x,
    double scale_y,
    double dx,
    double dy,
    uint8_t *dst
) {
    if (
        !src || !dst || source_width <= 0 || source_height <= 0 ||
        target_width <= 0 || target_height <= 0 || scale_x <= 0.0 || scale_y <= 0.0
    ) {
        return 1;
    }

    double *temp = (double *)calloc((size_t)source_height * (size_t)target_width * 4, sizeof(double));
    double *sharp_x = (double *)calloc((size_t)source_height * (size_t)target_width * 4, sizeof(double));
    double *resampled = (double *)calloc((size_t)target_height * (size_t)target_width * 4, sizeof(double));
    if (!temp || !sharp_x || !resampled) {
        free(temp);
        free(sharp_x);
        free(resampled);
        return 2;
    }

    double distance_scale_x = scale_x < 1.0 ? scale_x : 1.0;
    double radius_x = 1.5 / distance_scale_x;
    for (int y = 0; y < source_height; y++) {
        for (int out_x = 0; out_x < target_width; out_x++) {
            double center = (((double)out_x - dx) + 0.5) / scale_x - 0.5;
            int start = (int)floor(center - radius_x) - 1;
            int end = (int)ceil(center + radius_x) + 1;
            if (start < 0) {
                start = 0;
            }
            if (end > source_width - 1) {
                end = source_width - 1;
            }
            double total_weight = 0.0;
            double channels[4] = {0.0, 0.0, 0.0, 0.0};
            for (int sx = start; sx <= end; sx++) {
                double distance = ((double)sx - center) * distance_scale_x;
                double weight = magic_kernel(distance);
                if (weight == 0.0) {
                    continue;
                }
                const uint8_t *pixel = src + ((y * source_width + sx) * 4);
                channels[0] += (double)pixel[0] * weight;
                channels[1] += (double)pixel[1] * weight;
                channels[2] += (double)pixel[2] * weight;
                channels[3] += (double)pixel[3] * weight;
                total_weight += weight;
            }
            double *out_pixel = temp + ((y * target_width + out_x) * 4);
            if (total_weight != 0.0) {
                out_pixel[0] = channels[0] / total_weight;
                out_pixel[1] = channels[1] / total_weight;
                out_pixel[2] = channels[2] / total_weight;
                out_pixel[3] = channels[3] / total_weight;
            }
        }
    }

    const double sharp_kernel[7] = {-1.0, 6.0, -35.0, 204.0, -35.0, 6.0, -1.0};
    const double sharp_divisor = 144.0;
    for (int y = 0; y < source_height; y++) {
        for (int x = 0; x < target_width; x++) {
            double channels[4] = {0.0, 0.0, 0.0, 0.0};
            for (int k = 0; k < 7; k++) {
                int px = x + k - 3;
                if (px < 0) {
                    px = 0;
                } else if (px >= target_width) {
                    px = target_width - 1;
                }
                double *pixel = temp + ((y * target_width + px) * 4);
                double weight = sharp_kernel[k];
                channels[0] += pixel[0] * weight;
                channels[1] += pixel[1] * weight;
                channels[2] += pixel[2] * weight;
                channels[3] += pixel[3] * weight;
            }
            double *out_pixel = sharp_x + ((y * target_width + x) * 4);
            out_pixel[0] = channels[0] / sharp_divisor;
            out_pixel[1] = channels[1] / sharp_divisor;
            out_pixel[2] = channels[2] / sharp_divisor;
            out_pixel[3] = channels[3] / sharp_divisor;
        }
    }

    double distance_scale_y = scale_y < 1.0 ? scale_y : 1.0;
    double radius_y = 1.5 / distance_scale_y;
    for (int out_y = 0; out_y < target_height; out_y++) {
        double center = (((double)out_y - dy) + 0.5) / scale_y - 0.5;
        int start = (int)floor(center - radius_y) - 1;
        int end = (int)ceil(center + radius_y) + 1;
        if (start < 0) {
            start = 0;
        }
        if (end > source_height - 1) {
            end = source_height - 1;
        }
        for (int x = 0; x < target_width; x++) {
            double total_weight = 0.0;
            double channels[4] = {0.0, 0.0, 0.0, 0.0};
            for (int sy = start; sy <= end; sy++) {
                double distance = ((double)sy - center) * distance_scale_y;
                double weight = magic_kernel(distance);
                if (weight == 0.0) {
                    continue;
                }
                double *pixel = sharp_x + ((sy * target_width + x) * 4);
                channels[0] += pixel[0] * weight;
                channels[1] += pixel[1] * weight;
                channels[2] += pixel[2] * weight;
                channels[3] += pixel[3] * weight;
                total_weight += weight;
            }
            double *out_pixel = resampled + ((out_y * target_width + x) * 4);
            if (total_weight != 0.0) {
                out_pixel[0] = channels[0] / total_weight;
                out_pixel[1] = channels[1] / total_weight;
                out_pixel[2] = channels[2] / total_weight;
                out_pixel[3] = channels[3] / total_weight;
            }
        }
    }

    for (int y = 0; y < target_height; y++) {
        for (int x = 0; x < target_width; x++) {
            double channels[4] = {0.0, 0.0, 0.0, 0.0};
            for (int k = 0; k < 7; k++) {
                int py = y + k - 3;
                if (py < 0) {
                    py = 0;
                } else if (py >= target_height) {
                    py = target_height - 1;
                }
                double *pixel = resampled + ((py * target_width + x) * 4);
                double weight = sharp_kernel[k];
                channels[0] += pixel[0] * weight;
                channels[1] += pixel[1] * weight;
                channels[2] += pixel[2] * weight;
                channels[3] += pixel[3] * weight;
            }
            uint8_t *out_pixel = dst + ((y * target_width + x) * 4);
            out_pixel[0] = clamp_byte(channels[0] / sharp_divisor);
            out_pixel[1] = clamp_byte(channels[1] / sharp_divisor);
            out_pixel[2] = clamp_byte(channels[2] / sharp_divisor);
            out_pixel[3] = clamp_byte(channels[3] / sharp_divisor);
        }
    }

    free(temp);
    free(sharp_x);
    free(resampled);
    return 0;
}
