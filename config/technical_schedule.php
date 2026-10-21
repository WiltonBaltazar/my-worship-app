<?php

return [
    /*
    | Streaming technicians are hidden for now: generation and edits only assign
    | lead and sound. Set TECH_STREAMING_ENABLED=true to bring the role back.
    */
    'streaming_enabled' => (bool) env('TECH_STREAMING_ENABLED', false),
];
