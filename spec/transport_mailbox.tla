----------------------------- MODULE transport_mailbox -----------------------------
EXTENDS Naturals, Sequences

VARIABLES pending, congested, sent

Init == /\ pending = Null
        /\ congested = FALSE
        /\ sent = << >>

NewSnapshot == CHOOSE s \in Nat : TRUE

Generate == /\ UNCHANGED congested
            /\ IF congested THEN pending' = NewSnapshot ELSE pending' = Null
            /\ IF congested THEN UNCHANGED sent ELSE sent' = Append(sent, NewSnapshot)

Toggle == /\ congested' = ~congested
          /\ IF ~congested /\ pending # Null THEN
                /\ sent' = Append(sent, pending)
                /\ pending' = Null
             ELSE
                /\ UNCHANGED <<pending, sent>>

Next == Generate \/ Toggle

Spec == Init /\ [][Next]_<<pending, congested, sent>>

PendingBound == pending = Null \/ pending \in Nat
NoBurst == Len(sent) <= Len([ ]_sent)
LatestDelivered == congested = FALSE /\ pending = Null

THEOREM Spec => []PendingBound
================================================================================
