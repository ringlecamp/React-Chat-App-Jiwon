import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Header from "../components/Header";
import { db, firebase } from "../firebase";
import {
  addMessage,
  addParticipants,
  loadIdChatRoom,
  loadMessages,
  modifyMessage,
  removeMessage,
  removeParticipants,
  setParticipants,
  unLoad,
  updateParticipants,
} from "../reducers/chat";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useHistory } from "react-router-dom";
import useInput from "../hooks/useInput";
import v4 from "uuid/dist/esm-browser/v4";
import ChatRoomHeader from "../components/ChatRoom/ChatRoomHeader";
import MessageItem from "../components/ChatRoom/MessageItem";
import MessageInput from "../components/ChatRoom/MessageInput";

const ChatRoom = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const { roomId } = useParams();

  const messages = useSelector((state) => state.chat.messages);
  const user = useSelector((state) => state.user.userProfile);
  const participants = useSelector((state) => state.chat.participants);

  const [submitFlag, setSubmitFlag] = useState(false);
  const [newCandidate, setNewCandidate] = useState(null);
  const [snapShotType, setSnapShotType] = useState("");
  const [text, onChangeText, setText] = useInput("");

  const [newParticipants, setNewParticipants] = useState(null);
  const [pSnapShotType, setpSnapShotType] = useState("");

  const getChatRoomData = async () => {
    const chatRef = await db.collection("chatRooms").doc(roomId);
    const doc = await chatRef.get();
    return doc.data();
  };
  const getMessages = async () => {
    const messageRef = await db
      .collection("chatRooms")
      .doc(roomId)
      .collection("messages");

    const snapshot = await messageRef.orderBy("created").get();
    return snapshot.docs.map((doc) => ({ ...doc.data() }));
  };

  const getChatRoomMember = async () => {
    const memberRef = await db
      .collection("chatRooms")
      .doc(roomId)
      .collection("participants");

    const snapshot = await memberRef.get();
    return snapshot.docs.map((doc) => ({ ...doc.data() }));
  };

  // ????????? ?????? ?????? ????????? ??????????????? ????????????.
  useEffect(() => {
    Promise.all([getChatRoomData(), getMessages(), getChatRoomMember()]).then(
      (r) => {
        dispatch(loadIdChatRoom(r[0]));
        dispatch(loadMessages(r[1]));
        dispatch(setParticipants(r[2]));
      }
    );
    return () => {
      dispatch(unLoad());
    };
  }, [dispatch]);

  //???????????? ???????????? ?????? ?????? ??????
  const doubleSubmitCheck = () => {
    if (submitFlag) {
      return submitFlag;
    } else {
      setSubmitFlag(true);
      return false;
    }
  };

  const onSubmitMessage = async () => {
    if (doubleSubmitCheck()) return;
    if (!text) {
      alert("????????? ??????????????????.");
      return;
    }

    const payload = {
      uidOfUser: user.uid,
      nickName: user.nickName,
      content: text,
      uid: v4(),
      created: firebase.firestore.Timestamp.now().seconds,
      emoji: { 1: [], 2: [] },
    };

    await db
      .collection("chatRooms")
      .doc(roomId)
      .collection("messages")
      .doc(payload.uid)
      .set(payload)
      .then(() => {
        setText("");
        setSubmitFlag(false);
      });
  };
  const onUpdateMessage = async (id, newContent) => {
    if (!newContent) {
      alert("???????????? ????????? ??????????????????.");
      return;
    }

    const messageRef = db
      .collection("chatRooms")
      .doc(roomId)
      .collection("messages")
      .doc(id);

    await messageRef.update({ content: newContent });
  };

  const onRemoveMessage = async (id) => {
    const answer = window.confirm("???????????? ?????????????????????????");
    if (!answer) return;

    const messageRef = db
      .collection("chatRooms")
      .doc(roomId)
      .collection("messages")
      .doc(id);

    await messageRef.delete();
  };

  //?????????
  useEffect(() => {
    const chatRef = db
      .collection("chatRooms")
      .doc(roomId)
      .collection("messages");
    chatRef.orderBy("created").onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newEntry = change.doc.data();
          setNewCandidate(newEntry);
          setSnapShotType("added");
        }
        if (change.type === "modified") {
          const newEntry = change.doc.data();
          newEntry.uid = change.doc.id;
          setNewCandidate(newEntry);
          setSnapShotType("modified");
        }
        if (change.type === "removed") {
          const newEntry = change.doc.data();
          newEntry.uid = change.doc.id;
          setNewCandidate(newEntry);
          setSnapShotType("removed");
        }
        setNewCandidate(null);
      });
    });
  }, []);

  useEffect(() => {
    if (!newCandidate) return;
    if (!messages) return;
    const index = messages.findIndex(
      (message) => message.uid === newCandidate.uid
    );
    if (index === -1 && snapShotType === "added") {
      dispatch(addMessage(newCandidate));
      return;
    }
    if (snapShotType === "modified") {
      dispatch(modifyMessage(index, newCandidate));
    }
    if (snapShotType === "removed") {
      dispatch(removeMessage(index, newCandidate));
    }
  }, [newCandidate, snapShotType]);

  //?????????
  useEffect(() => {
    const participantsRef = db
      .collection("chatRooms")
      .doc(roomId)
      .collection("participants");
    participantsRef.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newEntry = change.doc.data();
          setNewParticipants(newEntry);
          setpSnapShotType("added");
        }
        if (change.type === "modified") {
          const newEntry = change.doc.data();
          newEntry.uid = change.doc.id;
          setNewParticipants(newEntry);
          setpSnapShotType("modified");
        }
        if (change.type === "removed") {
          const newEntry = change.doc.data();
          setNewParticipants(newEntry);
          setpSnapShotType("removed");
        }
        setNewParticipants(null);
      });
    });
  }, []);

  useEffect(() => {
    if (!newParticipants) return;
    if (!participants) return;

    const index = participants.findIndex((p) => p.uid === newParticipants.uid);
    if (index === -1 && pSnapShotType === "added") {
      dispatch(addParticipants(newParticipants));
      return;
    }
    if (pSnapShotType === "modified") {
      dispatch(updateParticipants(newParticipants.uid, newParticipants));
    }
    if (pSnapShotType === "removed") {
      dispatch(removeParticipants(newParticipants));
    }
  }, [newParticipants, pSnapShotType]);

  const handleAccept = (user) => {
    const answer = window.confirm(`${user.nickName}??? ?????????????????????????`);
    if (!answer) return;

    const changeChatRoomParticipants = async () => {
      await db
        .collection("chatRooms")
        .doc(roomId)
        .collection("participants")
        .doc(user.uid)
        .update({ nickName: user.nickName, uid: user.uid, type: "accept" });
    };
    const changeUsersParticipants = async () => {
      await db
        .collection("users")
        .doc(user.uid)
        .collection("participants")
        .doc(roomId)
        .update({ cid: roomId, type: "accept" });
    };

    Promise.all([
      changeChatRoomParticipants(),
      changeUsersParticipants(),
    ]).then(() => {});
  };

  const handleReject = (user, word) => {
    const answer = window.confirm(`${user.nickName}??? ${word}???????????????????`);
    if (!answer) return;

    const deleteChatRoomParticipants = async () => {
      await db
        .collection("chatRooms")
        .doc(roomId)
        .collection("participants")
        .doc(user.uid)
        .delete();
    };
    const deleteUsersParticipants = async () => {
      await db
        .collection("users")
        .doc(user.uid)
        .collection("participants")
        .doc(roomId)
        .delete();
    };

    Promise.all([
      deleteChatRoomParticipants(),
      deleteUsersParticipants(),
    ]).then((r) => console.log(r));
  };

  const onClickEmoji = async (emojiKey, messageId) => {
    const messageRef = db
      .collection("chatRooms")
      .doc(roomId)
      .collection("messages")
      .doc(messageId);
    const doc = await messageRef.get();

    const data = doc.data();
    const emojiObj = { ...data.emoji };

    const list = emojiObj[emojiKey];
    let newList = [];
    if (list && list.includes(user.uid)) {
      newList = list.filter((item) => item !== user.uid);
    }
    if (list && !list.includes(user.uid)) {
      newList = list.concat(user.uid);
    }
    emojiObj[emojiKey] = newList;

    await messageRef.update({
      emoji: emojiObj,
    });
  };

  //????????? ????????????
  const unSubscribeRoom = (admin) => {
    const answer = window.confirm("???????????? ?????????????????????????");
    if (!answer) return;

    const unSubscribeAtChatRooms = async () => {
      await db
        .collection("chatRooms")
        .doc(roomId)
        .collection("participants")
        .doc(user.uid)
        .delete();
    };
    const unSubscribeAtUsers = async () => {
      await db
        .collection("users")
        .doc(user.uid)
        .collection("participants")
        .doc(roomId)
        .delete();
    };
    if (!admin) {
      Promise.all([unSubscribeAtChatRooms(), unSubscribeAtUsers()]).then(() =>
        history.push("/chat/list")
      );
      return;
    }

    const waiting = participants.filter((item) => item.type === "waiting");
    const accept = participants.filter((item) => item.type === "accept");

    if (admin && accept.length === 0 && waiting.length === 0) {
      const removeRoom = async () => {
        await db.collection("chatRooms").doc(roomId).delete();
      };
      removeRoom().then(() => history.push("/chat/list"));
      return;
    }
    if (admin && accept.length === 0) {
      waiting.forEach((item) => {
        db.collection("users")
          .doc(item.uid)
          .collection("participants")
          .doc(roomId)
          .delete()
          .then((r) => console.log(r));
      });
      history.push("chat/list");
      return;
    }

    if (admin) {
      const updateHost = async () => {
        await db.collection("chatRooms").doc(roomId).update({
          host: accept[0].uid,
          hostNickName: accept[0].nickName,
        });
      };
      const updateAtParticipants = async () => {
        await db
          .collection("chatRooms")
          .doc(roomId)
          .collection("participants")
          .doc(accept[0].uid)
          .delete();
      };
      const updateAtUsers = async () => {
        await db
          .collection("users")
          .doc(accept[0].uid)
          .collection("participants")
          .doc(roomId)
          .delete();
      };

      Promise.all([updateHost(), updateAtParticipants(), updateAtUsers()]).then(
        () => {
          history.push("/chat/list");
        }
      );
      return;
    }
  };

  return (
    <Container>
      <Header />
      <ChatRoomContainer>
        <ChatRoomHeader
          handleAccept={handleAccept}
          handleReject={handleReject}
          unSubscribeRoom={unSubscribeRoom}
        />
        <MessageListWrapper>
          {messages &&
            messages.map((message, index) => (
              <MessageItem
                key={index}
                content={message.content}
                writerId={message.uidOfUser}
                writer={message.nickName}
                id={message.uid}
                onUpdateMessage={onUpdateMessage}
                onRemoveMessage={onRemoveMessage}
                emojiObj={message.emoji}
                onClickEmoji={onClickEmoji}
                created={message.created}
              />
            ))}
        </MessageListWrapper>
        <MessageInput
          text={text}
          onChangeText={onChangeText}
          onSubmitMessage={onSubmitMessage}
        />
      </ChatRoomContainer>
    </Container>
  );
};
const Container = styled.div`
  width: 100%;
  margin: 0 auto;
`;
const ChatRoomContainer = styled.div`
  background: #f7f6ee;
  margin: 7vh auto;
  width: 60%;
  height: 65vh;
  box-shadow: 0px 6px 15px 6px rgba(200, 200, 200, 0.8);
  border-radius: 50px;
  padding: 5vh 3vw;
  @media (max-width: 800px) {
    width: 90%;
  }
`;
const MessageListWrapper = styled.div`
  height: 80%;
  border: 1px solid #838383;
  margin-bottom: 2vh;
  overflow-y: scroll;
`;

export default ChatRoom;
