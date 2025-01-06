---
title: "Raspberry Pi Zero - video test"
date: 2017-01-12T19:07:00.000Z
categories:
  - diy
tags:
  - raspberry
cover:
  image: "assets/my-raspberry-pi-zero-for-5-bucks.jpg"
  caption: "My Raspberry Pi Zero for 5 bucks"
  relative: true
draft: false
---

I've been contemplating the idea of employing a Raspberry Pi for a pet project of mine. This project requires both audio and video playback capabilities over a sustained period. Naturally, my aim is to keep the hardware costs to a minimum. Hence, the Raspberry Pi Zero, which is effectively a $5 computer (though in actuality, [it costs around $20](/en/posts/raspberry-pi-zero-unboxing-and-first-test)) presents an attractive option.

The quality of playback truly exceeded my expectations. It's commendably good! However, it's not without its flaws. For instance, upon starting video and audio playback, the initial few seconds of sound are truncated. Considering the nature of the device, this minor hiccup doesn't deter from its overall performance. I urge you to check it out yourself here:

{{< youtube id="4Jsn0uaIpGI" title="Raspberry Pi Zero  - playing video test" >}}

The video you see was downloaded from YouTube, formatted in MP4, 720p. Given more time, I intend to experiment with higher quality formats. The operating system installed on the board is a lightweight version of Raspbian, without a graphical interface.

One key thing to note about the Raspberry Pi Zero is its lack of an inbuilt sound card. This leaves us with two alternatives - transmitting sound via HDMI (as demonstrated in the video) or resorting to an external sound card. While audio transmission over HDMI works seamlessly right out of the box, getting an external sound card to function might require a bit of fiddling.

![The cheap sound card I used in my tests](assets/the-cheap-sound-card-i-used-in-my-tests.jpg "The cheap sound card I used in my tests")

Another challenge I've encountered involves finding a method to send sound through the external sound card using the `omxplayer`, which is the recommended player for this setup. I have managed to get sound transmission working with `mpg123` after tweaking some settings, but `omxplayer` remains silent. This area warrants further investigation. At present, the only workaround is to connect the speakers directly to the TV.

On a positive note, with a simple script, it's entirely possible to play both video and audio playlists! I've tested this and can confirm it works. There is a small hiccup, however. When transitioning from one video to another, there's a noticeable delay, and the first few seconds of sound are cut off. But if a one-second delay is not a deal-breaker for you, and you're open to adding a few seconds of black screen at the beginning of each video, then it's a minor inconvenience at most. Given the capabilities of such an affordable device, I believe this is a very commendable outcome.
