<?php

$salt = 'RandomSaltsAreGoodWhenTheyAreRandomlyRandom';
$pass = $_GET['pass'];

echo sha1($salt . $pass);

?>