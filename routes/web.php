<?php

use Illuminate\Support\Facades\Route;

Route::get('/admin/{path?}', function (): \Illuminate\Http\RedirectResponse {
    return redirect('/admin-app');
})->where('path', '.*');

Route::view('/{path?}', 'app')
    ->where('path', '^(?!api(?:/|$)|up$).*$');
