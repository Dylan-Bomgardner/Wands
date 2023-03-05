function handleMessage(data: string, 
    setOpponentHealthVisual: (health: number) => void,
    writeSocket: (data: string) => void) {
    let data_json = JSON.parse(data);
    if (data_json.msg_type === "attack") {
      if ("damage" in data_json.effects) {
        setTimeout(() => {
          if(!blocking)
          {
            setHealth(health - data_json.effects.damage);
            console.log("You were hit by " + data_json.effects.damage + " damage!");
          }
          else
          {
            
          }       
        }, 1000);
      }
    }
    else if (data_json.msg_type === "hit_notif") {
      console.log("Opponent was hit by your " + data_json.what_hit + "!");
    }
    else if (data_json.msg_type === "health_notif") {
      setOpponentHealthVisual(data_json.new_health);
    }
  }