#include "borderless.hpp"
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Graphics.Capture.h>
int allowBorderless() {
  try {
    using namespace winrt::Windows::Graphics::Capture;
    auto status = GraphicsCaptureAccess::RequestAccessAsync(GraphicsCaptureAccessKind::Borderless).get();
    return static_cast<int>(status);
  } catch (...) {
    return -1;
  }
}
