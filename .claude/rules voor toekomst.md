rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
// Users can only read/write their own profile
match /users/{userId} {
allow read, write: if request.auth != null && request.auth.uid == userId;
}

    // Rooms: anyone authenticated can read, but write rules depend on your game logic
    match /rooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null; // You may want to restrict this further
      allow delete: if false; // Or only room creator
    }

}
}

rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
match /{document=\*\*} {
allow read, write: if request.auth != null;
}
}
}
