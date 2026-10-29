# ORIGIN

`packages/avatars/src/bot/` is a direct port of the bot engine from the
repository *grok-agent-avatars* ("bloub"), an MIT-licensed SVG recreation of
the x.ai bot avatar.

- MIT license text: below, and in the upstream repo.
- The port is mechanical: 1:1 source files, re-formatted to this repo's Biome
  style (double quotes, semicolons) and given explicit `.js` extensions for
  NodeNext module resolution. No constant is modified.
- The measurement notes file (`docs/measurements.md` upstream) remains visible
  at: https://github.com/anthropics/grok-agent-avatars — re-generation of
  `profiles.ts` is out of scope for this package.

## MIT License

Copyright (c) 2026 Jérémy Perret (bloub)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Design attribution

bloub recreates the visual behaviour of the x.ai bot avatar as an exercise. It
is "Not affiliated with, endorsed by or connected to x.ai. It recreates the
visual behaviour of their bot avatar as an exercise; 'Grok' and 'x.ai' belong
to their owners." That caveat carries over here.
