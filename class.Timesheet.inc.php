<?php
class Timesheet {
	protected $db;
	protected $userID;
	private $salt = 'RandomSaltsAreGoodWhenTheyAreRandomlyRandom';
	
	public function __construct($userID = null) {
		// save the userID so that other functions dont need to have it explicitely cited
		if ($userID) {
			$this->userID = $userID;
		}
		
		// open a database connection
		$this->db = mysqli_init();
		$this->db->ssl_set('/etc/mysql/server-key.pem', '/etc/mysql/server-cert.pem', '/etc/mysql/ca-cert.pem', null, null);
		$this->db->real_connect('server', 'username', 'password', 'timesheets', null, null, MYSQLI_CLIENT_SSL);
	}
	
	
	public function addTask() {
		$stmt = $this->db->prepare("INSERT INTO tasks (name,user_id) VALUES ('Queued Item',?)");
		$stmt->bind_param('i', $this->userID);
		$stmt->execute();
		$stmt->close();
		
		return $this->db->insert_id;
	}
	
	public function loginUser($user, $pass) {
		$stmt = $this->db->prepare("SELECT id, password FROM users WHERE username=?");
		$stmt->bind_param('s', $user);
		$stmt->execute();
		$stmt->bind_result($id, $password);
		$stmt->fetch();
		$stmt->close();
		if ($password === sha1($this->salt . $pass)) {
			return $id;
		}
		return null;
	}

	public function pauseTask($taskID) {
		$stmt = $this->db->prepare("UPDATE tasks SET stop_time=CURRENT_TIMESTAMP,total_time=total_time+(TIME_TO_SEC(TIMEDIFF(CURRENT_TIMESTAMP,start_time))/3600),daily_time=daily_time+(TIME_TO_SEC(TIMEDIFF(CURRENT_TIMESTAMP,start_time))/3600), active='F' WHERE id=?");
		$stmt->bind_param('i', $taskID);
		$stmt->execute();
		$stmt->close();
		
		$stmt = $this->db->prepare("SELECT daily_time FROM tasks WHERE id=?");
		$stmt->bind_param('i', $taskID);
		$stmt->execute();
		$stmt->bind_result($daily_time);
		$stmt->fetch();
		$stmt->close();
		
		return json_encode(array('daily_time' => $daily_time));
	}
	
	public function editTask($taskID, $text) {
		$stmt = $this->db->prepare("UPDATE tasks SET name=?, synced=0 WHERE id=?");
		$stmt->bind_param('si', $text, $taskID);
		$stmt->execute();
		$stmt->close();
	}
	
	public function restoreTasks() {
		$stmt = $this->db->prepare("SELECT id, type, name, start_time, daily_time, details, active, completed FROM tasks WHERE user_id=? AND (completed='F' OR daily_time>0)");
		$stmt->bind_param('i', $this->userID);
		$stmt->execute();
		$stmt->bind_result($id, $type, $name, $start_time, $daily_time, $details, $active, $completed);
		
		$result = array();
		while ($stmt->fetch()) {
			$result[$id] = array('id' => $id, 'type' => $type, 'name' => $name, '$start_time' => $start_time, 'daily_time' => $daily_time, 'details' => $details, 'active' => $active, 'completed' => $completed);
		}
		$stmt->close();
		
		$stmt = $this->db->prepare("UPDATE tasks SET synced=1 WHERE user_id=? AND (completed='F' OR daily_time>0)");
		$stmt->bind_param('i', $this->userID);
		$stmt->execute();
		$stmt->close();
		
		$stmt = $this->db->prepare("SELECT queue_order FROM users WHERE id=?");
		$stmt->bind_param('i', $this->userID);
		$stmt->execute();
		$stmt->bind_result($queue_order);
		$stmt->fetch();
		$order = unserialize($queue_order);
		$stmt->close();
		// takes the order that was saved and the tasks and puts them in order,
		// goal is to prevent the javascript from having to handle the reordering
		$final = array();
		foreach($order as $id){
			$final[] = $result[$id]; // sets the final array with the result row
			unset($result[$id]); // unsets used row, since it is now located in the final array
		}
		// takes everything else that was not in a specific order and adds them 
		// to the end of the final array
		foreach($result as $row){
			$final[] = $row;
		}
		return json_encode($final);
	}
	
	public function getCompletedTasks($start) {
		$stmt = $this->db->prepare("SELECT id, name, type FROM tasks WHERE user_id=? AND completed='T' ORDER BY stop_time DESC LIMIT ?,10");
		$stmt->bind_param('ii', $this->userID, $start);
		$stmt->execute();
		$stmt->bind_result($id, $name, $type);
		$result = array();
		while ($stmt->fetch()) {
			$result[] = array('id' => $id, 'name' => $name, 'type' => $type);
		}
		$stmt->close();
		return json_encode($result);
	}
	
	public function uncompleteTask($taskID) {
		$stmt = $this->db->prepare("UPDATE tasks SET completed='F' WHERE id=?");
		$stmt->bind_param('i', $taskID);
		$stmt->execute();
		$stmt->close();
		
		$stmt = $this->db->prepare("SELECT id, name, type, details, daily_time FROM tasks WHERE id=?");
		$stmt->bind_param('1', $taskID);
		$stmt->execute();
		$stmt->bind_result($id, $name, $type, $details, $daily_time);
		$stmt->fetch();
		
		return json_encode(array('id' => $id, 'name' => $name, 'type' => $type, 'details' => $details, 'daily_time' => $daily_time));
	}
	
	public function getUnsyncedTasks() {
		$stmt = $this->db->prepare("SELECT queue_order,synced FROM users WHERE id=?");
		$stmt->bind_param('i', $this->userID);
		$stmt->execute();
		$stmt->bind_result($queue_order, $synced);
		$stmt->fetch();
		$stmt->close();

		$stmt = $this->db->prepare("SELECT id, type, name, start_time, daily_time, details, active, completed FROM tasks WHERE user_id=? AND synced=0 AND (completed='F' OR daily_time>0)");
		$stmt->bind_param('i', $this->userID);
		$stmt->execute();
		$stmt->bind_result($id, $type, $name, $start_time, $daily_time, $details, $active, $completed);
		$result = array();
		while ($stmt->fetch()) {
			$result[] = array('id' => $id, 'type' => $type, 'name' => $name, '$start_time' => $start_time, 'daily_time' => $daily_time, 'details' => $details, 'active' => $active, 'completed' => $completed);
		}
		$stmt->close();

		$result['order'] = unserialize($queue_order);
		
		$stmt = $this->db->prepare("UPDATE tasks SET synced=1 WHERE user_id=? AND (completed='F' OR daily_time>0)");
		$stmt->bind_param('i', $this->userID);
		$stmt->execute();
		$stmt->close();
		
		$stmt = $this->db->prepare("UPDATE users SET synced=1 WHERE id=?");
		$stmt->bind_param('i', $this->userID);
		$stmt->execute();
		$stmt->close();
		
		return json_encode($result);
	}
	
	public function setQueueOrder($order) {
		$stmt = $this->db->prepare("UPDATE users SET queue_order=?,synced=0 WHERE id=?");
		$stmt->bind_param('si', $order, $this->userID);
		$stmt->execute();
		$stmt->close();
	}
	
	public function editTaskDetails($taskID, $details) {
		$stmt = $this->db->prepare("UPDATE tasks SET details=?, synced=0 WHERE id=?");
		$stmt->bind_param('si', $details, $taskID);
		$stmt->execute();
		$stmt->close();
	}

	public function editTaskType($taskID, $type) {
		$stmt = $this->db->prepare("UPDATE tasks SET type=?, synced=0 WHERE id=?");
		$stmt->bind_param('si', $type, $taskID);
		$stmt->execute();
		$stmt->close();
	}
	public function startTask($taskID) {
		$stmt = $this->db->prepare("UPDATE tasks SET start_time=CURRENT_TIMESTAMP, active='T' WHERE id=?");
		$stmt->bind_param('i', $taskID);
		$stmt->execute();
		$stmt->close();
	}
	public function completeTask($taskID) {
		$stmt = $this->db->prepare("UPDATE tasks SET completed='T' WHERE id=?");
		$stmt->bind_param('i', $taskID);
		$stmt->execute();
		$stmt->close();
	}
	public function resetDay() {
		$stmt = $this->db->prepare("UPDATE tasks SET daily_time=0.00 WHERE user_id=?");
		$stmt->bind_param('i', $this->userID);
		$stmt->execute();
		$stmt->close();
	}
	public function changeTaskOwner($taskID, $userID) {
		$stmt = $this->db->prepare("UPDATE tasks SET user_id=?, synced=0 WHERE id=?");
		$stmt->bind_param('ii', $userID, $taskID);
		$stmt->execute();
		$stmt->close();
	}

}
?>