<?php
session_start();
ini_set ('display_errors',1);
error_reporting (E_ALL & ~E_NOTICE);

$action = $_POST['action'];
if(isset($_POST['task'])) $taskID = $_POST['task'];
if(isset($_POST['text'])) $text = $_POST['text'];
if(isset($_POST['user'])) $user = $_POST['user'];
if(isset($_POST['order'])) $order = serialize($_POST['order']);
if(isset($_POST['start'])) $start = $_POST['start'];
if(isset($_POST['username'])) $username = $_POST['username'];
if(isset($_POST['password'])) $password = $_POST['password'];

include_once('class.Timesheet.inc.php');

if ($_SESSION['user']) {
	$timesheet = new Timesheet($_SESSION['user']);
} else {
	$timesheet = new Timesheet();
}

switch($action){
	case 'add': 
		echo $timesheet->addTask(); 
		break;
	case 'pause': 
		echo $timesheet->pauseTask($taskID); 
		break;
	case 'login': 
		$_SESSION['user'] = $timesheet->loginUser($username,$password);
		if ($_SESSION['user']) {
			header('Location: index.php');
		} else {
			header('Location: login.html');
		}
		break;
	case 'editTask':
		$timesheet->editTask($taskID, $text);
		break;
	case 'restore': 
		echo $timesheet->restoreTasks();
		break;
	case 'unComplete':
		echo $timesheet->uncompleteTask($taskID);
		break;
	case 'getCompletes': 
		echo $timesheet->getCompletedTasks($start);
		break;
	case 'refresh':
		echo $timesheet->getUnsyncedTasks();
		break;
	case 'queueOrder':
		$timesheet->setQueueOrder($order);
		break;
	case 'editDetails':
		$timesheet->editTaskDetails($taskID, $text);
		break;
	case 'editType':
		$timesheet->editTaskType($taskID, $text);
		break;
	case 'start':
		$timesheet->startTask($taskID);
		break;
	case 'complete':
		$timesheet->completeTask($taskID);
		break;
	case 'resetDay':
		$timesheet->resetDay();
		break;
	case 'changeOwner':
		$timesheet->changeTaskOwner($taskID, $user);
		break;
}
?>