#pragma once
#include "common.hpp"
#include <condition_variable>
#include <cstdint>
#include <cstdio>
// Forwards the capture already open for the local preview to the party stream.
// The preview thread only publishes a frame when the previous one was taken, and never waits on the
// pipe. The writer scales that frame to 720p NV12 before stderr, which is what the party actually encodes.
class Relay {
  static constexpr uint32_t MAGIC = 0x52465343;
  static constexpr uint32_t KIND_VIDEO = 1, KIND_AUDIO = 2;
  static constexpr uint32_t MAX_WIDTH = 1280, MAX_HEIGHT = 720;
  std::atomic<bool> enabled{false}, stopped{false};
  std::mutex mu;
  std::mutex audioMu;
  std::condition_variable cv;
  std::vector<BYTE> video, audio;
  uint32_t width = 0, height = 0, format = 0, stride = 0, sampleRate = 0;
  bool videoDirty = false;
  std::atomic<bool> audioDirty{false};
  std::atomic<int64_t> nextVideoTicks{0};
  std::thread worker;
  static bool writeAll(HANDLE out, const void* data, DWORD size) {
    auto* p = static_cast<const BYTE*>(data);
    while (size) {
      DWORD wrote = 0;
      if (!WriteFile(out, p, size, &wrote, nullptr) || !wrote) return false;
      p += wrote;
      size -= wrote;
    }
    return true;
  }
  static void fit(uint32_t w, uint32_t h, uint32_t& ow, uint32_t& oh) {
    ow = w;
    oh = h;
    if (ow > MAX_WIDTH) {
      oh = oh * MAX_WIDTH / ow;
      ow = MAX_WIDTH;
    }
    if (oh > MAX_HEIGHT) {
      ow = ow * MAX_HEIGHT / oh;
      oh = MAX_HEIGHT;
    }
    ow &= ~1u;
    oh &= ~1u;
    if (ow < 2) ow = 2;
    if (oh < 2) oh = 2;
  }
  static int yOf(int b, int g, int r) { return (77 * r + 150 * g + 29 * b) >> 8; }
  static int uOf(int b, int g, int r) {
    int u = ((-43 * r - 85 * g + 128 * b) >> 8) + 128;
    return u < 0 ? 0 : u > 255 ? 255 : u;
  }
  static int vOf(int b, int g, int r) {
    int v = ((128 * r - 107 * g - 21 * b) >> 8) + 128;
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }
  static bool toNv12(
    const BYTE* src,
    uint32_t pitch,
    uint32_t w,
    uint32_t h,
    uint32_t fmt,
    uint32_t ow,
    uint32_t oh,
    std::vector<BYTE>& dst
  ) {
    if (!w || !h || !ow || !oh || w < 2 || h < 2) return false;
    if (fmt == 1 && pitch < w) return false;
    if (fmt == 2 && pitch < w * 2) return false;
    if (fmt == 3 && pitch < w * 4) return false;
    if (fmt != 1 && fmt != 2 && fmt != 3) return false;
    dst.resize(size_t(ow) * oh * 3 / 2);
    BYTE* yPlane = dst.data();
    BYTE* uvPlane = yPlane + size_t(ow) * oh;
    for (uint32_t y = 0; y < oh; y++) {
      uint32_t sy = uint32_t((uint64_t(y) * h) / oh);
      if (sy >= h) sy = h - 1;
      const BYTE* srcRow = src + size_t(sy) * pitch;
      BYTE* row = yPlane + size_t(y) * ow;
      for (uint32_t x = 0; x < ow; x++) {
        uint32_t sx = uint32_t((uint64_t(x) * w) / ow);
        if (sx >= w) sx = w - 1;
        if (fmt == 1) row[x] = srcRow[sx];
        else if (fmt == 2) row[x] = srcRow[sx * 2];
        else {
          const BYTE* p = srcRow + size_t(sx) * 4;
          row[x] = static_cast<BYTE>(yOf(p[0], p[1], p[2]));
        }
      }
    }
    for (uint32_t y = 0; y < oh; y += 2) {
      uint32_t sy = uint32_t((uint64_t(y) * h) / oh);
      if (sy >= h) sy = h - 1;
      BYTE* uv = uvPlane + size_t(y / 2) * ow;
      for (uint32_t x = 0; x < ow; x += 2) {
        uint32_t sx = uint32_t((uint64_t(x) * w) / ow) & ~1u;
        if (sx + 1 >= w) sx = w - 2;
        if (fmt == 1) {
          const BYTE* p = src + size_t(pitch) * h + size_t(sy / 2) * pitch + sx;
          uv[x] = p[0];
          uv[x + 1] = p[1];
        } else if (fmt == 2) {
          const BYTE* p = src + size_t(sy) * pitch + size_t(sx) * 2;
          uv[x] = p[1];
          uv[x + 1] = p[3];
        } else {
          const BYTE* p = src + size_t(sy) * pitch + size_t(sx) * 4;
          uv[x] = static_cast<BYTE>(uOf(p[0], p[1], p[2]));
          uv[x + 1] = static_cast<BYTE>(vOf(p[0], p[1], p[2]));
        }
      }
    }
    return true;
  }
  static bool packNv12(const BYTE* src, uint32_t pitch, uint32_t w, uint32_t h, std::vector<BYTE>& dst) {
    if (pitch < w || (h & 1)) return false;
    dst.resize(size_t(w) * h * 3 / 2);
    for (uint32_t y = 0; y < h; y++)
      memcpy(dst.data() + size_t(y) * w, src + size_t(y) * pitch, w);
    const BYTE* uvSrc = src + size_t(pitch) * h;
    BYTE* uv = dst.data() + size_t(w) * h;
    for (uint32_t y = 0; y < h / 2; y++)
      memcpy(uv + size_t(y) * w, uvSrc + size_t(y) * pitch, w);
    return true;
  }
  void send(
    HANDLE out,
    uint32_t kind,
    uint32_t a,
    uint32_t b,
    uint32_t c,
    uint32_t d,
    const std::vector<BYTE>& payload
  ) {
    if (payload.empty() || payload.size() > 32u * 1024u * 1024u) return;
    uint32_t hdr[7] = {MAGIC, kind, a, b, c, d, static_cast<uint32_t>(payload.size())};
    if (!writeAll(out, hdr, sizeof(hdr))) return;
    writeAll(out, payload.data(), static_cast<DWORD>(payload.size()));
  }
  void run() {
    SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_BELOW_NORMAL);
    HANDLE out = GetStdHandle(STD_ERROR_HANDLE);
    std::vector<BYTE> frame, pcm, packed;
    while (!stopped) {
      uint32_t w = 0, h = 0, fmt = 0, pitch = 0, rate = 0;
      bool sendVideo = false, sendAudio = false;
      {
        std::unique_lock lock(mu);
        cv.wait_for(lock, std::chrono::milliseconds(50), [this] {
          return stopped.load() || videoDirty || audioDirty.load();
        });
        if (stopped) break;
        if (videoDirty) {
          frame.swap(video);
          videoDirty = false;
          w = width;
          h = height;
          fmt = format;
          pitch = stride;
          sendVideo = true;
        }
      }
      {
        std::lock_guard lock(audioMu);
        if (!audio.empty()) {
          // Move — do not swap. swap() would put the previous pcm back into
          // `audio`, so the next loop re-sent a full ~192 KB buffer (~100× realtime).
          pcm = std::move(audio);
          audio.clear();
          rate = sampleRate;
          audioDirty = false;
          sendAudio = true;
        }
      }
      if (sendVideo) {
        uint32_t ow = 0, oh = 0;
        fit(w, h, ow, oh);
        bool ok = fmt == 1 && ow == w && oh == h
          ? packNv12(frame.data(), pitch, w, h, packed)
          : toNv12(frame.data(), pitch, w, h, fmt, ow, oh, packed);
        if (ok) send(out, KIND_VIDEO, ow, oh, 1, ow, packed);
      }
      if (sendAudio) {
        send(out, KIND_AUDIO, rate, 2, 0, 0, pcm);
        pcm.clear();
      }
    }
  }
 public:
  Relay() : worker([this] { run(); }) {}
  ~Relay() {
    stopped = true;
    cv.notify_all();
    if (worker.joinable()) worker.join();
  }
  Relay(const Relay&) = delete;
  Relay& operator=(const Relay&) = delete;
  bool on() const { return enabled.load(); }
  void enable(bool value) { enabled = value; }
  // format: 1 NV12, 2 YUY2, 3 BGRA. `pitch` is the row stride in bytes.
  // Skips the frame when one is already waiting, so a slow stream never stalls the preview.
  void pushVideo(const BYTE* data, long pitch, uint32_t w, uint32_t h, uint32_t fmt) {
    if (!enabled.load(std::memory_order_relaxed) || !data || pitch <= 0 || !w || !h || w > 8192 ||
        h > 8192)
      return;
    auto now = std::chrono::steady_clock::now();
    if (now.time_since_epoch().count() < nextVideoTicks.load(std::memory_order_relaxed)) return;
    size_t rows = fmt == 1 ? size_t(h) * 3 / 2 : size_t(h);
    size_t bytes = size_t(pitch) * rows;
    if (!bytes || bytes > 32u * 1024u * 1024u) return;
    std::unique_lock lock(mu, std::try_to_lock);
    if (!lock.owns_lock() || videoDirty) return;
    video.resize(bytes);
    memcpy(video.data(), data, bytes);
    width = w;
    height = h;
    format = fmt;
    stride = static_cast<uint32_t>(pitch);
    videoDirty = true;
    nextVideoTicks.store(
      (now + std::chrono::milliseconds(16)).time_since_epoch().count(),
      std::memory_order_relaxed
    );
    cv.notify_one();
  }
  void pushAudio(const BYTE* data, size_t bytes, uint32_t rate) {
    if (!enabled.load(std::memory_order_relaxed) || !data || !bytes || bytes > 256u * 1024u) return;
    // Own mutex so the WASAPI tap never contends with video capture or waits on try_lock drops.
    {
      std::lock_guard lock(audioMu);
      constexpr size_t kMax = 192u * 1024u;
      if (audio.size() + bytes > kMax) {
        size_t drop = audio.size() + bytes - kMax;
        drop = (drop + 3u) & ~size_t(3); // stereo s16 frames
        if (drop >= audio.size()) audio.clear();
        else audio.erase(audio.begin(), audio.begin() + static_cast<std::ptrdiff_t>(drop));
      }
      audio.insert(audio.end(), data, data + bytes);
      sampleRate = rate;
      audioDirty = true;
    }
    cv.notify_one();
  }
};
