# Convex Multiplayer Cursors

This repo has an adaptation of our position encoding from AI town for multiplayer cursors.

The implementation has the following properties:
- Roughly 1 mutation/sec per active client. We can increase this frequency to target ~500ms lag, since we can assume here that most cursors are idle.
- One player moving a cursor should only invalidate 1 query which is then shared by all other peers.
- When everyone's idle the system is idle.

## TODOs

- [ ] Add optimistic updates. Right now we just special case the player's cursor to always move it to the latest local value.
- [ ] Add metadata to the positions which can be used server-side for deciding if a move is valid. For example, this lets the developer express that someone is dragging a particular UI element and ban anyone else from moving it.
- [ ] Time out inactive cursors.
- [ ] Don't replay recent history on initial load.
- [ ] Improve the React API: Ian had some great ideas on making it really simple to drop this in.
- [ ] Make the demo UI a lot prettier.
  - [ ] The coordinate spaces are all off for the mouse event -> `position: absolute` div
  - [ ] There's also a fixed, arbitrary z-order. We should sort the player's cursor above everyone else's.

## Demo


Updated, and from the `reorg` branch API:
https://github.com/get-convex/multiplayer-cursors/assets/366683/d6f23d45-124f-4a31-8e3b-6dd4f0fc0446

Older:
https://github.com/get-convex/multiplayer-cursors/assets/5784949/135932d0-c46b-4126-bed9-9b1d601143ca
