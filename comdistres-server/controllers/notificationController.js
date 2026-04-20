export const getNotifications = async (req,res)=>{
  const notes = await Notification.findAll({
    where:{ user_id:req.user.id, is_read:false }
  });
  res.json(notes);
};
