<?php
ob_start("ob_gzhandler");
session_start();
if(!isset($_SESSION['user'])){
	header('Location: login.html');
}
?>

<!DOCTYPE html>
<html>
<head>
	<title>Timesheet Tasklist</title>
	<link type="text/css" href="css/redmond/jquery-ui-1.8.custom.css" rel="stylesheet" />
	<link type="text/css" href="css/timesheet.css" rel="stylesheet" />
</head>
<body>

<div id="main-container">
	<h2>Timesheet Tasklist</h2>
	<div id="timesheetcontainer">
		<table id="timesheet-table" class="ui-corner-all">
			<thead>
				<tr>
					<th>Project</th>
					<th>Activity</th>
					<th>Time</th>
				</tr>
			</thead>
			<tbody>
			</tbody>
		</table>
	</div>
	
	<div id="fancyClock" class="ui-corner-all ui-hidden"></div>
	
	<div id="queuecontainer"></div>
	
	<div id="menucontainer"></div>
</div>

<script src="js/jquery-1.4.2.min.js"></script>
<script src="js/jquery-ui-1.8.custom.min.js"></script>
<script src="js/jquery.ui.tzineClock.js"></script>
<script src="js/jquery.ui.queueManager.js"></script>
<script>
$('#queuecontainer').queueManager({'userID':<?php echo $_SESSION['user']; ?>,'start':true, 'table':'timesheet-table', 'uncomplete': true, 'debug':false});
</script>
</body>
</html>